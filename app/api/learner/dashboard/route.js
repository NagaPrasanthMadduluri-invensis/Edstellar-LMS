import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

const HOURS_GOAL = 10;
const THIS_YM    = "2026-06";
const TODAY      = "2026-06-15";

function relativeTime(isoDate) {
  if (!isoDate) return "";
  const diff = Math.floor((new Date(TODAY) - new Date(isoDate.replace(" ", "T"))) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} week${Math.floor(diff / 7) > 1 ? "s" : ""} ago`;
  return `${Math.floor(diff / 30)} month${Math.floor(diff / 30) > 1 ? "s" : ""} ago`;
}

function addDays(isoDate, days) {
  const d = new Date(isoDate.replace(" ", "T"));
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const SKILL_MAP = [
  ["project management", "Project Mgmt"],
  ["agile", "Agile"],
  ["scrum", "Scrum"],
  ["ai for", "AI"],
  ["banking", "Finance"],
  ["leadership", "Leadership"],
  ["communication", "Communication"],
];

function skillTagsFromCourses(names) {
  const tags = new Set();
  for (const name of names) {
    const lower = name.toLowerCase();
    for (const [key, tag] of SKILL_MAP) {
      if (lower.includes(key)) tags.add(tag);
    }
  }
  return [...tags].slice(0, 5);
}

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  if (payload.role !== "learner") return err("Forbidden", 403);

  const db = await getDb();
  const userId = payload.userId;

  /* ── Enrolled courses with progress ── */
  const assignments = (await db.execute({
    sql: `SELECT uca.id AS enrollment_id, uca.assigned_at,
      c.id AS course_id, c.name, c.description, c.thumbnail_url,
      (SELECT COUNT(*) FROM lessons l JOIN course_modules cm ON cm.id = l.module_id
       WHERE cm.course_id = c.id AND l.is_active = 1 AND cm.is_active = 1) AS total_lessons,
      (SELECT COUNT(*) FROM user_lesson_completions ulc
       JOIN lessons l ON l.id = ulc.lesson_id
       JOIN course_modules cm ON cm.id = l.module_id
       WHERE cm.course_id = c.id AND ulc.user_id = ?) AS completed_lessons,
      (SELECT MAX(ulc.completed_at) FROM user_lesson_completions ulc
       JOIN lessons l ON l.id = ulc.lesson_id
       JOIN course_modules cm ON cm.id = l.module_id
       WHERE cm.course_id = c.id AND ulc.user_id = ?) AS last_activity
    FROM user_course_assignments uca
    JOIN courses c ON c.id = uca.course_id
    WHERE uca.user_id = ? AND c.is_active = 1
    ORDER BY uca.assigned_at DESC`,
    args: [userId, userId, userId],
  })).rows;

  const enrolled_courses = assignments.map((row) => {
    const pct = row.total_lessons > 0 ? Math.round((row.completed_lessons / row.total_lessons) * 100) : 0;
    const done = row.total_lessons > 0 && row.completed_lessons >= row.total_lessons;
    const inProg = !done && row.completed_lessons > 0;
    return {
      enrollment_id: row.enrollment_id,
      assigned_at: row.assigned_at,
      last_activity: row.last_activity || null,
      status: done ? "completed" : inProg ? "in-progress" : "assigned",
      progress_percentage: pct,
      due_date: addDays(row.assigned_at, 44),
      course: {
        id: row.course_id,
        name: row.name,
        description: row.description,
        thumbnail_url: row.thumbnail_url,
        total_lessons: Number(row.total_lessons),
        completed_lessons: Number(row.completed_lessons),
      },
    };
  });

  /* ── Stats ── */
  const completed_courses = enrolled_courses.filter((c) => c.status === "completed").length;
  const in_progress_courses = enrolled_courses.filter((c) => c.status === "in-progress").length;
  const yet_to_start = enrolled_courses.filter((c) => c.status === "assigned").length;

  const hoursRow = (await db.execute({
    sql: `SELECT COALESCE(ROUND(SUM(l.duration_minutes) / 60.0, 1), 0) AS hrs
          FROM user_lesson_completions ulc
          JOIN lessons l ON l.id = ulc.lesson_id
          WHERE ulc.user_id = ? AND strftime('%Y-%m', ulc.completed_at) = ?`,
    args: [userId, THIS_YM],
  })).rows[0];
  const hours_this_month = Number(hoursRow?.hrs ?? 0);

  const allTimeHoursRow = (await db.execute({
    sql: `SELECT COALESCE(ROUND(SUM(l.duration_minutes) / 60.0, 1), 0) AS hrs
          FROM user_lesson_completions ulc
          JOIN lessons l ON l.id = ulc.lesson_id
          WHERE ulc.user_id = ?`,
    args: [userId],
  })).rows[0];
  const hours_all_time = Number(allTimeHoursRow?.hrs ?? 0);

  const completedAssessments = Number((await db.execute({ sql: "SELECT COUNT(*) AS c FROM user_assessment_attempts WHERE user_id = ?", args: [userId] })).rows[0].c);
  const passedAssessments    = Number((await db.execute({ sql: "SELECT COUNT(*) AS c FROM user_assessment_attempts WHERE user_id = ? AND is_passed = 1", args: [userId] })).rows[0].c);

  /* ── Points, Rank, Badges ── */
  const completedLessonsCount = Number((await db.execute({ sql: "SELECT COUNT(*) AS c FROM user_lesson_completions WHERE user_id = ?", args: [userId] })).rows[0].c);
  const points = completedLessonsCount * 10 + passedAssessments * 50;
  const badges = passedAssessments;

  // Rank: count learners with more points than this user + 1
  const allLearners = (await db.execute("SELECT id FROM users WHERE role = 'learner'")).rows;
  let rank = 1;
  for (const l of allLearners) {
    if (l.id === userId) continue;
    const lLessons = Number((await db.execute({ sql: "SELECT COUNT(*) AS c FROM user_lesson_completions WHERE user_id = ?", args: [l.id] })).rows[0].c);
    const lPassed  = Number((await db.execute({ sql: "SELECT COUNT(*) AS c FROM user_assessment_attempts WHERE user_id = ? AND is_passed = 1", args: [l.id] })).rows[0].c);
    const lPoints  = lLessons * 10 + lPassed * 50;
    if (lPoints > points) rank++;
  }

  /* ── Skill tags from course names ── */
  const skill_tags = skillTagsFromCourses(enrolled_courses.map((c) => c.course.name));

  /* ── Continue Learning: most recently active in-progress course ── */
  const continueCourse = enrolled_courses
    .filter((c) => c.status === "in-progress")
    .sort((a, b) => (b.last_activity || "").localeCompare(a.last_activity || ""))[0] || null;

  /* ── Journey: all courses in assignment order ── */
  const journey = enrolled_courses
    .slice()
    .sort((a, b) => (a.assigned_at || "").localeCompare(b.assigned_at || ""))
    .map((c) => ({
      course_id: c.course.id,
      name: c.course.name,
      status: c.status,
      progress_percentage: c.progress_percentage,
    }));

  const journeyCompleted = journey.filter((c) => c.status === "completed").length;

  /* ── Upcoming Deadlines: by due_date asc ── */
  const upcoming_deadlines = enrolled_courses
    .filter((c) => c.status !== "completed")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 4)
    .map((c) => ({
      course_id: c.course.id,
      name: c.course.name,
      due_date: c.due_date,
      status: c.status,
    }));

  /* ── Recent Assessment Attempts ── */
  const recentAttempts = (await db.execute({
    sql: `SELECT ua.*, a.title AS assessment_title, c.name AS course_name
          FROM user_assessment_attempts ua
          JOIN assessments a ON a.id = ua.assessment_id
          JOIN courses c ON c.id = a.course_id
          WHERE ua.user_id = ? ORDER BY ua.submitted_at DESC LIMIT 5`,
    args: [userId],
  })).rows;

  /* ── Recent Activity (union of events) ── */
  const lessonEvents = (await db.execute({
    sql: `SELECT ulc.completed_at AS event_time, l.title AS title, c.name AS course_name, 'lesson' AS type
          FROM user_lesson_completions ulc
          JOIN lessons l ON l.id = ulc.lesson_id
          JOIN course_modules cm ON cm.id = l.module_id
          JOIN courses c ON c.id = cm.course_id
          WHERE ulc.user_id = ? ORDER BY ulc.completed_at DESC LIMIT 3`,
    args: [userId],
  })).rows;

  const assessmentEvents = (await db.execute({
    sql: `SELECT ua.submitted_at AS event_time, a.title AS title, c.name AS course_name,
                 'assessment' AS type, ua.is_passed
          FROM user_assessment_attempts ua
          JOIN assessments a ON a.id = ua.assessment_id
          JOIN courses c ON c.id = a.course_id
          WHERE ua.user_id = ? ORDER BY ua.submitted_at DESC LIMIT 3`,
    args: [userId],
  })).rows;

  const assignmentEvents = (await db.execute({
    sql: `SELECT uca.assigned_at AS event_time, c.name AS title, c.name AS course_name, 'assignment' AS type
          FROM user_course_assignments uca
          JOIN courses c ON c.id = uca.course_id
          WHERE uca.user_id = ? ORDER BY uca.assigned_at DESC LIMIT 3`,
    args: [userId],
  })).rows;

  const recent_activity = [
    ...lessonEvents.map((e) => ({ type: "lesson",      title: e.title,      course: e.course_name, time: e.event_time, time_label: relativeTime(e.event_time) })),
    ...assessmentEvents.map((e) => ({ type: "assessment", title: e.title,   course: e.course_name, time: e.event_time, time_label: relativeTime(e.event_time), passed: e.is_passed === 1 })),
    ...assignmentEvents.map((e) => ({ type: "assignment",  title: `Assigned: ${e.title}`, course: e.course_name, time: e.event_time, time_label: relativeTime(e.event_time) })),
  ]
    .sort((a, b) => (b.time || "").localeCompare(a.time || ""))
    .slice(0, 8);

  return ok({
    enrolled_courses,
    stats: {
      assigned_courses: enrolled_courses.length,
      in_progress_courses,
      completed_courses,
      yet_to_start,
      hours_this_month,
      hours_goal: HOURS_GOAL,
      hours_all_time,
      completed_assessments: completedAssessments,
    },
    points,
    rank,
    rank_of: allLearners.length,
    badges,
    skill_tags,
    continue_learning: continueCourse,
    journey: { courses: journey, completed: journeyCompleted, total: journey.length },
    upcoming_deadlines,
    recent_activity,
    recentAttempts,
  });
}
