import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  if (payload.role !== "learner") return err("Forbidden", 403);

  const { assessmentId } = await params;
  const userId = payload.userId;
  const db = getDb();

  const assessment = db.prepare(`
    SELECT a.*, c.name as course_name FROM assessments a
    JOIN courses c ON c.id = a.course_id
    WHERE a.id = ? AND a.is_active = 1
  `).get(assessmentId);
  if (!assessment) return err("Assessment not found", 404);

  // Verify assignment to the course
  const assigned = db.prepare(`
    SELECT id FROM user_course_assignments WHERE user_id = ? AND course_id = ?
  `).get(userId, assessment.course_id);
  if (!assigned) return err("Access denied", 403);

  const questions = db.prepare(`
    SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY sort_order
  `).all(assessmentId);

  for (const q of questions) {
    // Return options WITHOUT is_correct flag to learner
    q.options = db.prepare("SELECT id, option_text FROM assessment_options WHERE question_id = ?").all(q.id);
  }

  const attempt_count = db.prepare(`
    SELECT COUNT(*) as c FROM user_assessment_attempts WHERE assessment_id = ? AND user_id = ?
  `).get(assessmentId, userId).c;

  return ok({ assessment, questions, attempt_count });
}
