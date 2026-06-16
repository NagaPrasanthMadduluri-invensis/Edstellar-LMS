import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

const DUE_DAYS = 44;

/* Synthetic content type & category per course */
const COURSE_META = {
  1: { contentType: "VIDEO", category: "Project Mgmt", isMandatory: true  },
  2: { contentType: "VIDEO", category: "Agile",        isMandatory: true  },
  3: { contentType: "VIDEO", category: "AI & Finance", isMandatory: false },
  4: { contentType: "VIDEO", category: "Leadership",   isMandatory: true  },
};

function addDays(isoDate, days) {
  const d = new Date(isoDate.replace(" ", "T"));
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso.replace ? iso.replace(" ", "T") : iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtShort(iso) {
  if (!iso) return null;
  const d = new Date(iso.replace ? iso.replace(" ", "T") : iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  if (payload.role !== "learner") return err("Forbidden", 403);

  const db     = await getDb();
  const userId = payload.userId;

  const rows = (await db.execute({
    sql: `SELECT uca.id AS enrollment_id, uca.assigned_at,
            c.id AS course_id, c.name, c.description, c.thumbnail_url,
            (SELECT COUNT(*) FROM lessons l JOIN course_modules cm ON cm.id = l.module_id
             WHERE cm.course_id = c.id AND l.is_active = 1 AND cm.is_active = 1) AS total_lessons,
            (SELECT COUNT(*) FROM user_lesson_completions ulc2
             JOIN lessons l ON l.id = ulc2.lesson_id
             JOIN course_modules cm ON cm.id = l.module_id
             WHERE cm.course_id = c.id AND ulc2.user_id = ?) AS completed_lessons,
            (SELECT COALESCE(SUM(l2.duration_minutes), 0)
             FROM user_lesson_completions ulc3
             JOIN lessons l2 ON l2.id = ulc3.lesson_id
             JOIN course_modules cm2 ON cm2.id = l2.module_id
             WHERE cm2.course_id = c.id AND ulc3.user_id = ?) AS completed_minutes,
            (SELECT COALESCE(SUM(l3.duration_minutes), 0)
             FROM lessons l3 JOIN course_modules cm3 ON cm3.id = l3.module_id
             WHERE cm3.course_id = c.id AND l3.is_active = 1 AND cm3.is_active = 1) AS total_minutes
          FROM user_course_assignments uca
          JOIN courses c ON c.id = uca.course_id AND c.is_active = 1
          WHERE uca.user_id = ?
          ORDER BY uca.assigned_at ASC`,
    args: [userId, userId, userId],
  })).rows;

  const courses = await Promise.all(rows.map(async (row) => {
    const total     = Number(row.total_lessons);
    const done      = Number(row.completed_lessons);
    const pct       = total > 0 ? Math.round((done / total) * 100) : 0;
    const dueDate   = addDays(row.assigned_at, DUE_DAYS);
    const meta      = COURSE_META[row.course_id] || { contentType: "VIDEO", category: null, isMandatory: false };

    /* best assessment score for this course */
    const scoreRow = (await db.execute({
      sql: `SELECT MAX(uaa.percentage) AS best, MIN(a.passing_score) AS passing, MAX(uaa.is_passed) AS has_passed
            FROM user_assessment_attempts uaa
            JOIN assessments a ON a.id = uaa.assessment_id
            WHERE a.course_id = ? AND uaa.user_id = ?`,
      args: [row.course_id, userId],
    })).rows[0];

    const bestScore   = scoreRow.best    !== null ? Number(scoreRow.best)    : null;
    const passingScore= scoreRow.passing !== null ? Number(scoreRow.passing) : 60;
    const hasPassed   = scoreRow.has_passed !== null ? Number(scoreRow.has_passed) === 1 : null;
    const hasAssessment = scoreRow.best !== null || (await db.execute({ sql: "SELECT COUNT(*) AS c FROM assessments WHERE course_id = ? AND is_active = 1", args: [row.course_id] })).rows[0].c > 0;
    const hasFailed   = pct === 100 && hasAssessment && hasPassed === false;

    let status;
    if (hasFailed)      status = "failed";
    else if (pct === 100) status = "completed";
    else if (pct > 0)   status = "in-progress";
    else                status = "assigned";

    return {
      enrollmentId:   row.enrollment_id,
      assignedAt:     row.assigned_at,
      assignedFmt:    fmtDate(row.assigned_at),
      dueDate,
      dueFmt:         fmtDate(dueDate),
      dueShort:       fmtShort(dueDate),
      status,
      progressPct:    pct,
      contentType:    meta.contentType,
      category:       meta.category,
      isMandatory:    meta.isMandatory,
      totalMinutes:   Number(row.total_minutes),
      bestScore,
      passingScore,
      hasFailed,
      course: {
        id:          row.course_id,
        name:        row.name,
        description: row.description,
      },
    };
  }));

  /* ── overview stats ── */
  const totalAssigned = courses.length;
  const inProgress    = courses.filter((c) => c.status === "in-progress").length;
  const completed     = courses.filter((c) => c.status === "completed").length;
  const assigned      = courses.filter((c) => c.status === "assigned").length;
  const failed        = courses.filter((c) => c.status === "failed").length;

  const scores = courses.map((c) => c.bestScore).filter((s) => s !== null);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const nextDeadlineCourse = courses
    .filter((c) => c.status !== "completed")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] || null;

  const journeyPct = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

  return ok({
    overview: { totalAssigned, inProgress, completed, assigned, failed, avgScore, nextDeadline: nextDeadlineCourse ? { short: nextDeadlineCourse.dueShort, courseName: nextDeadlineCourse.course.name } : null },
    journeyPct,
    courses,
  });
}
