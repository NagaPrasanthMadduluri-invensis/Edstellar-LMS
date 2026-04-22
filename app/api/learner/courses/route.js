import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  if (payload.role !== "learner") return err("Forbidden", 403);

  const db = getDb();
  const userId = payload.userId;

  const rows = db.prepare(`
    SELECT uca.id as enrollment_id, uca.assigned_at as granted_at,
      c.id as course_id, c.name, c.thumbnail_url,
      (SELECT COUNT(*) FROM lessons l JOIN course_modules cm ON cm.id = l.module_id
       WHERE cm.course_id = c.id AND l.is_active = 1 AND cm.is_active = 1) as total_lessons,
      (SELECT COUNT(*) FROM user_lesson_completions ulc
       JOIN lessons l ON l.id = ulc.lesson_id
       JOIN course_modules cm ON cm.id = l.module_id
       WHERE cm.course_id = c.id AND ulc.user_id = ?) as completed_lessons
    FROM user_course_assignments uca
    JOIN courses c ON c.id = uca.course_id
    WHERE uca.user_id = ? AND c.is_active = 1
    ORDER BY uca.assigned_at DESC
  `).all(userId, userId);

  const courses = rows.map((row) => {
    const pct = row.total_lessons > 0 ? Math.round((row.completed_lessons / row.total_lessons) * 100) : 0;
    return {
      enrollment_id: row.enrollment_id,
      granted_at: row.granted_at,
      status: pct === 100 ? "completed" : "active",
      progress_percentage: pct,
      course: { id: row.course_id, name: row.name, thumbnail_url: row.thumbnail_url, duration_hours: 0 },
      schedule: null,
    };
  });

  return ok({ courses });
}
