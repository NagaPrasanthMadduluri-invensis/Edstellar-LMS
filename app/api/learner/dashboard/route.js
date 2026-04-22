import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  if (payload.role !== "learner") return err("Forbidden", 403);

  const db = await getDb();
  const userId = payload.userId;

  const assignments = (await db.execute({
    sql: `SELECT uca.id as enrollment_id, uca.assigned_at as granted_at,
      c.id as course_id, c.name, c.description, c.thumbnail_url,
      (SELECT COUNT(*) FROM lessons l JOIN course_modules cm ON cm.id = l.module_id
       WHERE cm.course_id = c.id AND l.is_active = 1 AND cm.is_active = 1) as total_lessons,
      (SELECT COUNT(*) FROM user_lesson_completions ulc
       JOIN lessons l ON l.id = ulc.lesson_id
       JOIN course_modules cm ON cm.id = l.module_id
       WHERE cm.course_id = c.id AND ulc.user_id = ?) as completed_lessons
    FROM user_course_assignments uca
    JOIN courses c ON c.id = uca.course_id
    WHERE uca.user_id = ? AND c.is_active = 1
    ORDER BY uca.assigned_at DESC`,
    args: [userId, userId],
  })).rows;

  const enrolled_courses = assignments.map((row) => {
    const pct = row.total_lessons > 0 ? Math.round((row.completed_lessons / row.total_lessons) * 100) : 0;
    const done = row.total_lessons > 0 && row.completed_lessons === row.total_lessons;
    return {
      enrollment_id: row.enrollment_id,
      granted_at: row.granted_at,
      status: done ? "completed" : "active",
      progress_percentage: pct,
      course: { id: row.course_id, name: row.name, description: row.description, thumbnail_url: row.thumbnail_url, duration_hours: 0 },
    };
  });

  const recentAttempts = (await db.execute({
    sql: `SELECT ua.*, a.title as assessment_title, c.name as course_name
    FROM user_assessment_attempts ua
    JOIN assessments a ON a.id = ua.assessment_id
    JOIN courses c ON c.id = a.course_id
    WHERE ua.user_id = ? ORDER BY ua.submitted_at DESC LIMIT 5`,
    args: [userId],
  })).rows;

  const stats = {
    assigned_courses: enrolled_courses.length,
    completed_courses: enrolled_courses.filter((c) => c.status === "completed").length,
    pending_assessments: 0,
    completed_assessments: (await db.execute({ sql: "SELECT COUNT(*) as c FROM user_assessment_attempts WHERE user_id = ?", args: [userId] })).rows[0].c,
  };

  return ok({ enrolled_courses, pending_payments: [], bookmarks: [], certificates: [], suggested_courses: [], stats, recentAttempts });
}
