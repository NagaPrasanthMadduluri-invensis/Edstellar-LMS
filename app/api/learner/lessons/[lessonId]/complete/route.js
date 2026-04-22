import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

export async function POST(request, { params }) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  if (payload.role !== "learner") return err("Forbidden", 403);

  const { lessonId } = await params;
  const userId = payload.userId;
  const db = await getDb();

  const lesson = (await db.execute({
    sql: `SELECT l.id, cm.course_id FROM lessons l JOIN course_modules cm ON cm.id = l.module_id WHERE l.id = ?`,
    args: [lessonId],
  })).rows[0];
  if (!lesson) return err("Lesson not found", 404);

  const assigned = (await db.execute({
    sql: `SELECT id FROM user_course_assignments WHERE user_id = ? AND course_id = ?`,
    args: [userId, lesson.course_id],
  })).rows[0];
  if (!assigned) return err("Access denied", 403);

  try {
    await db.execute({
      sql: `INSERT OR IGNORE INTO user_lesson_completions (user_id, lesson_id) VALUES (?,?)`,
      args: [userId, lessonId],
    });
  } catch {
    // Already completed — fine
  }

  return ok({ message: "Lesson marked as complete" });
}
