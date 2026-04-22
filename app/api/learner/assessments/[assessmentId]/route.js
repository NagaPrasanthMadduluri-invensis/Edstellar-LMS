import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  if (payload.role !== "learner") return err("Forbidden", 403);

  const { assessmentId } = await params;
  const userId = payload.userId;
  const db = await getDb();

  const assessment = (await db.execute({
    sql: `SELECT a.*, c.name as course_name FROM assessments a JOIN courses c ON c.id = a.course_id WHERE a.id = ? AND a.is_active = 1`,
    args: [assessmentId],
  })).rows[0];
  if (!assessment) return err("Assessment not found", 404);

  // Verify assignment to the course
  const assigned = (await db.execute({
    sql: `SELECT id FROM user_course_assignments WHERE user_id = ? AND course_id = ?`,
    args: [userId, assessment.course_id],
  })).rows[0];
  if (!assigned) return err("Access denied", 403);

  const questions = (await db.execute({
    sql: `SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY sort_order`,
    args: [assessmentId],
  })).rows;

  for (const q of questions) {
    // Return options WITHOUT is_correct flag to learner
    q.options = (await db.execute({ sql: "SELECT id, option_text FROM assessment_options WHERE question_id = ?", args: [q.id] })).rows;
  }

  const attempt_count = (await db.execute({
    sql: `SELECT COUNT(*) as c FROM user_assessment_attempts WHERE assessment_id = ? AND user_id = ?`,
    args: [assessmentId, userId],
  })).rows[0].c;

  return ok({ assessment, questions, attempt_count });
}
