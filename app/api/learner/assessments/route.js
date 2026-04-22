import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  if (payload.role !== "learner") return err("Forbidden", 403);

  const userId = payload.userId;
  const db = await getDb();

  const assignments = (await db.execute({
    sql: `SELECT uca.course_id, c.name as course_name
    FROM user_course_assignments uca
    JOIN courses c ON c.id = uca.course_id AND c.is_active = 1
    WHERE uca.user_id = ?`,
    args: [userId],
  })).rows;

  const result = [];

  for (const assignment of assignments) {
    const courseId = assignment.course_id;

    const lessonCounts = (await db.execute({
      sql: `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN ulc.id IS NOT NULL THEN 1 ELSE 0 END) as completed
      FROM lessons l
      JOIN course_modules cm ON cm.id = l.module_id
      LEFT JOIN user_lesson_completions ulc ON ulc.lesson_id = l.id AND ulc.user_id = ?
      WHERE cm.course_id = ? AND l.is_active = 1 AND cm.is_active = 1`,
      args: [userId, courseId],
    })).rows[0];

    const is_unlocked =
      lessonCounts.total > 0 && lessonCounts.completed === lessonCounts.total;

    const courseAssessments = (await db.execute({
      sql: `SELECT a.id, a.title, a.description, a.passing_score,
        (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.id) as questions_count,
        (SELECT COUNT(*) FROM user_assessment_attempts WHERE assessment_id = a.id AND user_id = ?) as attempt_count,
        (SELECT MAX(percentage) FROM user_assessment_attempts WHERE assessment_id = a.id AND user_id = ?) as best_score
      FROM assessments a WHERE a.course_id = ? AND a.is_active = 1
      ORDER BY a.created_at`,
      args: [userId, userId, courseId],
    })).rows;

    for (const ca of courseAssessments) {
      const attempts = (await db.execute({
        sql: `SELECT id, score, total_questions, percentage, is_passed, submitted_at
        FROM user_assessment_attempts
        WHERE assessment_id = ? AND user_id = ?
        ORDER BY submitted_at DESC`,
        args: [ca.id, userId],
      })).rows;

      result.push({
        ...ca,
        course_id: courseId,
        course_name: assignment.course_name,
        is_unlocked,
        has_passed: attempts.some((a) => a.is_passed),
        last_attempt: attempts[0] || null,
        attempts,
      });
    }
  }

  return ok({ assessments: result });
}
