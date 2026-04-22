import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { courseId } = await params;
  const db = getDb();

  const assignments = db.prepare(`
    SELECT uca.*, u.first_name, u.last_name, u.email,
      (SELECT COUNT(*) FROM user_lesson_completions ulc
       JOIN lessons l ON l.id = ulc.lesson_id
       JOIN course_modules cm ON cm.id = l.module_id
       WHERE cm.course_id = ? AND ulc.user_id = uca.user_id) as completed_lessons,
      (SELECT COUNT(*) FROM lessons l
       JOIN course_modules cm ON cm.id = l.module_id
       WHERE cm.course_id = ? AND l.is_active = 1 AND cm.is_active = 1) as total_lessons
    FROM user_course_assignments uca
    JOIN users u ON u.id = uca.user_id
    WHERE uca.course_id = ?
    ORDER BY uca.assigned_at DESC
  `).all(courseId, courseId, courseId);

  return ok({ assignments });
}

export async function POST(request, { params }) {
  const adminPayload = requireAdmin(request);
  if (!adminPayload) return err("Unauthorized", 401);
  const { courseId } = await params;
  const { user_id } = await request.json();
  if (!user_id) return err("user_id is required");

  const db = getDb();

  const user = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'learner'").get(user_id);
  if (!user) return err("Learner not found", 404);

  try {
    db.prepare(`
      INSERT INTO user_course_assignments (user_id, course_id, assigned_by) VALUES (?,?,?)
    `).run(user_id, courseId, adminPayload.userId);
  } catch {
    return err("User is already assigned to this course", 409);
  }

  return ok({ message: "User assigned successfully" }, 201);
}
