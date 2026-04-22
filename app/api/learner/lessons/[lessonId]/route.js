import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  if (payload.role !== "learner") return err("Forbidden", 403);

  const { lessonId } = await params;
  const userId = payload.userId;
  const db = await getDb();

  const lesson = (await db.execute({
    sql: `SELECT l.*, cm.title as module_title, cm.course_id
    FROM lessons l
    JOIN course_modules cm ON cm.id = l.module_id
    WHERE l.id = ? AND l.is_active = 1`,
    args: [lessonId],
  })).rows[0];
  if (!lesson) return err("Lesson not found", 404);

  // Verify the user is assigned to the course
  const assigned = (await db.execute({
    sql: `SELECT id FROM user_course_assignments WHERE user_id = ? AND course_id = ?`,
    args: [userId, lesson.course_id],
  })).rows[0];
  if (!assigned) return err("Access denied", 403);

  // Sequential lock check
  const moduleLessons = (await db.execute({
    sql: `SELECT l.id,
      CASE WHEN ulc.id IS NOT NULL THEN 'completed' ELSE 'not_started' END as status
    FROM lessons l
    LEFT JOIN user_lesson_completions ulc ON ulc.lesson_id = l.id AND ulc.user_id = ?
    WHERE l.module_id = ? AND l.is_active = 1
    ORDER BY l.sort_order, l.id`,
    args: [userId, lesson.module_id],
  })).rows;

  const posInModule = moduleLessons.findIndex((l) => l.id === Number(lessonId));

  if (posInModule > 0) {
    if (moduleLessons[posInModule - 1].status !== "completed") {
      return err("This lesson is locked. Complete the previous lesson first.", 403);
    }
  } else if (posInModule === 0) {
    const mod = (await db.execute({ sql: `SELECT * FROM course_modules WHERE id = ?`, args: [lesson.module_id] })).rows[0];
    const prevModule = (await db.execute({
      sql: `SELECT id FROM course_modules
      WHERE course_id = ? AND is_active = 1 AND (sort_order < ? OR (sort_order = ? AND id < ?))
      ORDER BY sort_order DESC, id DESC LIMIT 1`,
      args: [mod.course_id, mod.sort_order, mod.sort_order, mod.id],
    })).rows[0];

    if (prevModule) {
      const counts = (await db.execute({
        sql: `SELECT COUNT(*) as total,
          SUM(CASE WHEN ulc.id IS NOT NULL THEN 1 ELSE 0 END) as completed
        FROM lessons l
        LEFT JOIN user_lesson_completions ulc ON ulc.lesson_id = l.id AND ulc.user_id = ?
        WHERE l.module_id = ? AND l.is_active = 1`,
        args: [userId, prevModule.id],
      })).rows[0];

      if (counts.total > 0 && counts.completed < counts.total) {
        return err("This lesson is locked. Complete all lessons in the previous module first.", 403);
      }
    }
  }

  const completion = (await db.execute({
    sql: `SELECT id FROM user_lesson_completions WHERE user_id = ? AND lesson_id = ?`,
    args: [userId, lessonId],
  })).rows[0];

  return ok({
    lesson: {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      content_type: lesson.content_type,
      content_url: lesson.content_url,
      duration_minutes: lesson.duration_minutes,
      module: { title: lesson.module_title },
    },
    progress_status: completion ? "completed" : "not_started",
  });
}
