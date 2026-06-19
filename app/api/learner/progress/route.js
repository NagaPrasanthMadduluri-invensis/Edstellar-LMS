import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

const THIS_YM = "2026-06";
const LAST_YM = "2026-05";
const TODAY   = "2026-06-15";
const GOAL_H  = 10;

const SKILL_MAP = [
  ["project management", "Project Mgmt"],
  ["agile", "Agile"],
  ["scrum", "Scrum"],
  ["ai for", "AI"],
  ["banking", "Finance"],
  ["leadership", "Leadership"],
  ["communication", "Communication"],
];

/* Parse ISO 8601 duration (e.g. "PT1H30M45S") → minutes */
function parseIsoDuration(iso) {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/);
  if (!m) return 0;
  return (parseFloat(m[1] || 0) * 60) + parseFloat(m[2] || 0) + (parseFloat(m[3] || 0) / 60);
}

function relativeTime(isoDate) {
  if (!isoDate) return "";
  const diff = Math.floor((new Date(TODAY) - new Date(isoDate.replace(" ", "T"))) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} week${Math.floor(diff / 7) > 1 ? "s" : ""} ago`;
  const mo = Math.floor(diff / 30);
  return `${mo} month${mo > 1 ? "s" : ""} ago`;
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T"));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function skillsFromNames(names) {
  const tags = new Set();
  for (const name of names) {
    const lower = name.toLowerCase();
    for (const [key, tag] of SKILL_MAP) {
      if (lower.includes(key)) tags.add(tag);
    }
  }
  return [...tags];
}

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  if (payload.role !== "learner") return err("Forbidden", 403);

  const db = await getDb();
  const userId = payload.userId;

  /* ── assignments ── */
  const assignments = (await db.execute({
    sql: `SELECT uca.course_id, uca.assigned_at,
            c.name, c.description
          FROM user_course_assignments uca
          JOIN courses c ON c.id = uca.course_id AND c.is_active = 1
          WHERE uca.user_id = ?
          ORDER BY uca.assigned_at ASC`,
    args: [userId],
  })).rows;

  /* ── per-course data ── */
  const courseHistory = [];

  for (const asgn of assignments) {
    const cid = asgn.course_id;

    const totalRow = (await db.execute({
      sql: `SELECT COUNT(*) AS n FROM lessons l
            JOIN course_modules cm ON cm.id = l.module_id
            WHERE cm.course_id = ? AND l.is_active = 1 AND cm.is_active = 1`,
      args: [cid],
    })).rows[0];
    const total = Number(totalRow.n);

    /* Count lessons done: standard completions UNION scorm completions (handles pre-auto-mark data) */
    const doneRow = (await db.execute({
      sql: `SELECT COUNT(*) AS n
            FROM lessons l
            JOIN course_modules cm ON cm.id = l.module_id
            WHERE cm.course_id = ? AND l.is_active = 1 AND cm.is_active = 1
              AND (
                l.id IN (SELECT lesson_id FROM user_lesson_completions WHERE user_id = ?)
                OR (l.content_type = 'scorm' AND l.scorm_package_id IS NOT NULL
                    AND EXISTS (
                      SELECT 1 FROM scorm_tracking st
                      WHERE st.package_id = l.scorm_package_id AND st.user_id = ?
                        AND (st.completion_status = 'completed'
                             OR st.lesson_status IN ('passed','completed'))
                    ))
              )`,
      args: [cid, userId, userId],
    })).rows[0];
    const done = Number(doneRow.n);

    /* Lesson-based time (non-SCORM lessons) */
    const minsRow = (await db.execute({
      sql: `SELECT COALESCE(SUM(l.duration_minutes), 0) AS mins
            FROM user_lesson_completions ulc
            JOIN lessons l ON l.id = ulc.lesson_id
            JOIN course_modules cm ON cm.id = l.module_id
            WHERE cm.course_id = ? AND ulc.user_id = ?`,
      args: [cid, userId],
    })).rows[0];
    let mins = Number(minsRow.mins);

    /* SCORM tracking for this course's SCORM lessons */
    const scormRows = (await db.execute({
      sql: `SELECT l.id, l.scorm_package_id,
                   st.lesson_status, st.completion_status, st.success_status,
                   st.score_raw, st.score_max, st.total_time, st.cmi_data
            FROM lessons l
            JOIN course_modules cm ON cm.id = l.module_id
            LEFT JOIN scorm_tracking st
              ON st.package_id = l.scorm_package_id AND st.user_id = ?
            WHERE cm.course_id = ? AND l.content_type = 'scorm'
              AND l.scorm_package_id IS NOT NULL
              AND l.is_active = 1 AND cm.is_active = 1`,
      args: [userId, cid],
    })).rows;

    let scormPartialBonus = 0;
    let scormScore = null;
    let scormHasPassed = null;

    for (const s of scormRows) {
      /* Add SCORM total_time (ISO 8601) to minutes */
      if (s.total_time) mins += parseIsoDuration(s.total_time);

      /* SCORM score */
      if (s.score_raw !== null) {
        const raw = Number(s.score_raw);
        const max = s.score_max ? Number(s.score_max) : 100;
        const pct = max > 0 ? Math.round((raw / max) * 100) : raw;
        if (scormScore === null || pct > scormScore) scormScore = pct;
      }

      /* SCORM pass/fail */
      if (s.success_status === "passed" || s.lesson_status === "passed") {
        scormHasPassed = true;
      } else if (
        (s.success_status === "failed" || s.lesson_status === "failed") &&
        scormHasPassed !== true
      ) {
        scormHasPassed = false;
      }

      /* Partial progress for in-progress SCORM (video left in middle) */
      const isDone =
        s.completion_status === "completed" ||
        s.lesson_status === "passed" ||
        s.lesson_status === "completed";
      if (!isDone && s.cmi_data && total > 0) {
        try {
          const cmi = typeof s.cmi_data === "string" ? JSON.parse(s.cmi_data) : s.cmi_data;
          const pm = parseFloat(cmi.progress_measure ?? 0);
          if (pm > 0) scormPartialBonus += pm * (1 / total) * 100;
        } catch {}
      }
    }

    /* Final progress % — count-based + partial SCORM bonus */
    const rawPct = total > 0 ? (done / total) * 100 + scormPartialBonus : 0;
    const pct = Math.min(Math.round(rawPct), done >= total ? 100 : 99);

    /* Assessment score (quiz) */
    const bestScoreRow = (await db.execute({
      sql: `SELECT MAX(uaa.percentage) AS best, MAX(uaa.is_passed) AS passed
            FROM user_assessment_attempts uaa
            JOIN assessments a ON a.id = uaa.assessment_id
            WHERE a.course_id = ? AND uaa.user_id = ?`,
      args: [cid, userId],
    })).rows[0];
    /* Use quiz score if available, else SCORM score */
    const score    = bestScoreRow.best  !== null ? Number(bestScoreRow.best)  : scormScore;
    const hasPassed = bestScoreRow.passed !== null ? Number(bestScoreRow.passed) === 1 : scormHasPassed;

    let status;
    if (done === 0 && scormPartialBonus === 0) status = "not started";
    else if (done < total || (scormPartialBonus > 0 && done < total)) status = "in progress";
    else if (hasPassed === false) status = "failed";
    else status = "completed";

    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const timeSpent = mins < 1 ? null : h > 0 ? `${h}h ${Math.round(m)}m` : `${Math.round(m)}m`;

    courseHistory.push({
      id: cid,
      name: asgn.name,
      type: scormRows.length > 0 ? "SCORM" : "VIDEO",
      status,
      progress: pct,
      score,
      timeSpent,
      hasPassed,
    });
  }

  /* ── summary stats ── */
  const assigned       = courseHistory.length;
  const completed      = courseHistory.filter((c) => c.status === "completed").length;
  const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

  const allScores = courseHistory.map((c) => c.score).filter((s) => s !== null);
  const avgScore  = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;
  const bestScore = allScores.length > 0 ? Math.max(...allScores) : null;

  /* ── all-time hours: lesson completions + SCORM time ── */
  const allTimeHoursRow = (await db.execute({
    sql: `SELECT COALESCE(ROUND(SUM(l.duration_minutes) / 60.0, 1), 0) AS hrs
          FROM user_lesson_completions ulc
          JOIN lessons l ON l.id = ulc.lesson_id
          WHERE ulc.user_id = ?`,
    args: [userId],
  })).rows[0];
  let allTimeHours = Number(allTimeHoursRow.hrs);

  const scormAllRows = (await db.execute({
    sql: `SELECT total_time FROM scorm_tracking WHERE user_id = ? AND total_time IS NOT NULL`,
    args: [userId],
  })).rows;
  for (const r of scormAllRows) allTimeHours += parseIsoDuration(r.total_time) / 60;
  allTimeHours = Math.round(allTimeHours * 10) / 10;

  /* ── assessment performance ── */
  const attemptRows = (await db.execute({
    sql: `SELECT a.title AS assessment_title, c.name AS course_name,
                 uaa.percentage AS score, uaa.is_passed, uaa.submitted_at
          FROM user_assessment_attempts uaa
          JOIN assessments a ON a.id = uaa.assessment_id
          JOIN courses c ON c.id = a.course_id
          WHERE uaa.user_id = ?
          ORDER BY uaa.submitted_at DESC`,
    args: [userId],
  })).rows;

  const perfAvg  = attemptRows.length > 0 ? Math.round(attemptRows.reduce((s, r) => s + Number(r.score), 0) / attemptRows.length) : null;
  const perfBest = attemptRows.length > 0 ? Math.max(...attemptRows.map((r) => Number(r.score))) : null;
  const passed   = attemptRows.filter((r) => Number(r.is_passed) === 1).length;
  const passRate = attemptRows.length > 0 ? Math.round((passed / attemptRows.length) * 100) : null;

  const seenAssessments = new Map();
  for (const r of attemptRows) {
    const key = `${r.course_name}::${r.assessment_title}`;
    if (!seenAssessments.has(key) || Number(r.score) > Number(seenAssessments.get(key).score)) {
      seenAssessments.set(key, r);
    }
  }
  const assessmentAttempts = [...seenAssessments.values()].map((r) => ({
    courseName: r.course_name,
    assessmentTitle: r.assessment_title,
    score: Number(r.score),
    passed: Number(r.is_passed) === 1,
  }));

  /* ── learning hours trend (lesson + SCORM) ── */
  const thisMonthLessonRow = (await db.execute({
    sql: `SELECT COALESCE(ROUND(SUM(l.duration_minutes) / 60.0, 1), 0) AS hrs
          FROM user_lesson_completions ulc
          JOIN lessons l ON l.id = ulc.lesson_id
          WHERE ulc.user_id = ? AND strftime('%Y-%m', ulc.completed_at) = ?`,
    args: [userId, THIS_YM],
  })).rows[0];
  const lastMonthLessonRow = (await db.execute({
    sql: `SELECT COALESCE(ROUND(SUM(l.duration_minutes) / 60.0, 1), 0) AS hrs
          FROM user_lesson_completions ulc
          JOIN lessons l ON l.id = ulc.lesson_id
          WHERE ulc.user_id = ? AND strftime('%Y-%m', ulc.completed_at) = ?`,
    args: [userId, LAST_YM],
  })).rows[0];

  const scormThisMonthRows = (await db.execute({
    sql: `SELECT total_time FROM scorm_tracking WHERE user_id = ? AND strftime('%Y-%m', updated_at) = ? AND total_time IS NOT NULL`,
    args: [userId, THIS_YM],
  })).rows;
  const scormLastMonthRows = (await db.execute({
    sql: `SELECT total_time FROM scorm_tracking WHERE user_id = ? AND strftime('%Y-%m', updated_at) = ? AND total_time IS NOT NULL`,
    args: [userId, LAST_YM],
  })).rows;

  let scormThisMonthMins = 0;
  for (const r of scormThisMonthRows) scormThisMonthMins += parseIsoDuration(r.total_time);
  let scormLastMonthMins = 0;
  for (const r of scormLastMonthRows) scormLastMonthMins += parseIsoDuration(r.total_time);

  const thisMonth = Math.round((Number(thisMonthLessonRow.hrs) + scormThisMonthMins / 60) * 10) / 10;
  const lastMonth = Math.round((Number(lastMonthLessonRow.hrs) + scormLastMonthMins / 60) * 10) / 10;

  const diff    = Math.round((thisMonth - lastMonth) * 10) / 10;
  const goalPct = Math.min(Math.round((thisMonth / GOAL_H) * 100), 100);

  /* ── skills from completed courses ── */
  const completedNames = courseHistory.filter((c) => c.status === "completed").map((c) => c.name);
  const skills = skillsFromNames(completedNames);

  /* ── activity timeline ── */
  const lessonEvents = (await db.execute({
    sql: `SELECT ulc.completed_at AS event_time, l.title, c.name AS course_name, 'lesson' AS type
          FROM user_lesson_completions ulc
          JOIN lessons l ON l.id = ulc.lesson_id
          JOIN course_modules cm ON cm.id = l.module_id
          JOIN courses c ON c.id = cm.course_id
          WHERE ulc.user_id = ?
          ORDER BY ulc.completed_at DESC LIMIT 5`,
    args: [userId],
  })).rows;

  const assessEvents = (await db.execute({
    sql: `SELECT uaa.submitted_at AS event_time, a.title, c.name AS course_name,
                 'assessment' AS type, uaa.is_passed
          FROM user_assessment_attempts uaa
          JOIN assessments a ON a.id = uaa.assessment_id
          JOIN courses c ON c.id = a.course_id
          WHERE uaa.user_id = ?
          ORDER BY uaa.submitted_at DESC LIMIT 5`,
    args: [userId],
  })).rows;

  const assignEvents = (await db.execute({
    sql: `SELECT uca.assigned_at AS event_time, c.name AS title, c.name AS course_name, 'assignment' AS type
          FROM user_course_assignments uca
          JOIN courses c ON c.id = uca.course_id
          WHERE uca.user_id = ?
          ORDER BY uca.assigned_at DESC`,
    args: [userId],
  })).rows;

  const scormEvents = (await db.execute({
    sql: `SELECT st.updated_at AS event_time, sp.title,
                 COALESCE(c.name, sp.title) AS course_name,
                 'scorm' AS type, st.lesson_status, st.completion_status
          FROM scorm_tracking st
          JOIN scorm_packages sp ON sp.id = st.package_id
          LEFT JOIN courses c ON c.id = sp.course_id
          WHERE st.user_id = ?
          ORDER BY st.updated_at DESC LIMIT 5`,
    args: [userId],
  })).rows;

  const timeline = [
    ...lessonEvents.map((e) => ({ type: "lesson",     title: e.title,                course: e.course_name, time: e.event_time, timeLabel: relativeTime(e.event_time), dateLabel: fmtDate(e.event_time) })),
    ...assessEvents.map((e) => ({ type: "assessment", title: e.title,                course: e.course_name, time: e.event_time, timeLabel: relativeTime(e.event_time), dateLabel: fmtDate(e.event_time), passed: Number(e.is_passed) === 1 })),
    ...assignEvents.map((e) => ({ type: "assignment", title: `Assigned: ${e.title}`, course: e.course_name, time: e.event_time, timeLabel: relativeTime(e.event_time), dateLabel: fmtDate(e.event_time) })),
    ...scormEvents.map((e) => ({
      type: "scorm",
      title: e.title,
      course: e.course_name,
      time: e.event_time,
      timeLabel: relativeTime(e.event_time),
      dateLabel: fmtDate(e.event_time),
      scormStatus: e.completion_status || e.lesson_status,
    })),
  ]
    .sort((a, b) => (b.time || "").localeCompare(a.time || ""))
    .slice(0, 15);

  return ok({
    summary: { assigned, completed, completionRate, avgScore, bestScore, allTimeHours },
    courseHistory,
    assessmentPerformance: { avgScore: perfAvg, bestScore: perfBest, passRate, attempts: assessmentAttempts },
    learningHours: { thisMonth, lastMonth, allTime: allTimeHours, goal: GOAL_H, goalPct, diff },
    skills,
    timeline,
  });
}
