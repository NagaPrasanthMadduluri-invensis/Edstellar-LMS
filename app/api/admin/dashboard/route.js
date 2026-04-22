import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);

  const db = getDb();

  const totalCourses   = db.prepare("SELECT COUNT(*) as c FROM courses WHERE is_active = 1").get().c;
  const totalUsers     = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'learner' AND is_active = 1").get().c;
  const totalAssigned  = db.prepare("SELECT COUNT(*) as c FROM user_course_assignments").get().c;
  const totalCompleted = db.prepare(`
    SELECT COUNT(DISTINCT uca.id) as c
    FROM user_course_assignments uca
    WHERE (
      SELECT COUNT(*) FROM lessons l
      JOIN course_modules cm ON cm.id = l.module_id
      WHERE cm.course_id = uca.course_id AND l.is_active = 1 AND cm.is_active = 1
    ) > 0
    AND (
      SELECT COUNT(*) FROM lessons l
      JOIN course_modules cm ON cm.id = l.module_id
      WHERE cm.course_id = uca.course_id AND l.is_active = 1 AND cm.is_active = 1
    ) = (
      SELECT COUNT(*) FROM user_lesson_completions ulc
      JOIN lessons l ON l.id = ulc.lesson_id
      JOIN course_modules cm ON cm.id = l.module_id
      WHERE cm.course_id = uca.course_id AND ulc.user_id = uca.user_id
    )
  `).get().c;

  const recentUsers = db.prepare(`
    SELECT id, first_name, last_name, email, created_at
    FROM users WHERE role = 'learner' ORDER BY created_at DESC LIMIT 5
  `).all();

  const recentAttempts = db.prepare(`
    SELECT ua.*, u.first_name, u.last_name, a.title as assessment_title, c.name as course_name
    FROM user_assessment_attempts ua
    JOIN users u ON u.id = ua.user_id
    JOIN assessments a ON a.id = ua.assessment_id
    JOIN courses c ON c.id = a.course_id
    ORDER BY ua.submitted_at DESC LIMIT 5
  `).all();

  return ok({
    stats: { totalCourses, totalUsers, totalAssigned, totalCompleted },
    recentUsers,
    recentAttempts,
  });
}
