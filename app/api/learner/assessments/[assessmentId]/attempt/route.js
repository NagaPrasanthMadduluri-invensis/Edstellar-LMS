import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

export async function POST(request, { params }) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  if (payload.role !== "learner") return err("Forbidden", 403);

  const { assessmentId } = await params;
  const userId = payload.userId;
  const { answers } = await request.json();
  // answers: [{ question_id, selected_option_id }]

  if (!Array.isArray(answers)) return err("Answers must be an array");

  const db = getDb();

  const assessment = db.prepare("SELECT * FROM assessments WHERE id = ? AND is_active = 1").get(assessmentId);
  if (!assessment) return err("Assessment not found", 404);

  const assigned = db.prepare(`
    SELECT id FROM user_course_assignments WHERE user_id = ? AND course_id = ?
  `).get(userId, assessment.course_id);
  if (!assigned) return err("Access denied", 403);

  const questions = db.prepare(`
    SELECT aq.*, ao.id as correct_option_id
    FROM assessment_questions aq
    JOIN assessment_options ao ON ao.question_id = aq.id AND ao.is_correct = 1
    WHERE aq.assessment_id = ?
  `).all(assessmentId);

  // Score the attempt
  let score = 0;
  const scoredAnswers = answers.map((a) => {
    const question = questions.find((q) => q.id === a.question_id);
    const isCorrect = question && a.selected_option_id === question.correct_option_id ? 1 : 0;
    if (isCorrect) score++;
    return { question_id: a.question_id, selected_option_id: a.selected_option_id || null, is_correct: isCorrect };
  });

  const total = questions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const is_passed = percentage >= assessment.passing_score ? 1 : 0;

  const attemptResult = db.prepare(`
    INSERT INTO user_assessment_attempts (user_id, assessment_id, score, total_questions, percentage, is_passed)
    VALUES (?,?,?,?,?,?)
  `).run(userId, assessmentId, score, total, percentage, is_passed);

  const attemptId = attemptResult.lastInsertRowid;

  const insertAnswer = db.prepare(`
    INSERT INTO user_assessment_answers (attempt_id, question_id, selected_option_id, is_correct) VALUES (?,?,?,?)
  `);
  for (const a of scoredAnswers) {
    insertAnswer.run(attemptId, a.question_id, a.selected_option_id, a.is_correct);
  }

  // Return result with correct answers
  const result = {
    attempt_id: attemptId,
    score,
    total_questions: total,
    percentage,
    is_passed: is_passed === 1,
    passing_score: assessment.passing_score,
    questions_review: questions.map((q) => {
      const userAnswer = scoredAnswers.find((a) => a.question_id === q.id);
      return {
        question_id: q.id,
        question_text: q.question_text,
        correct_option_id: q.correct_option_id,
        selected_option_id: userAnswer?.selected_option_id || null,
        is_correct: userAnswer?.is_correct === 1,
      };
    }),
  };

  return ok({ result });
}
