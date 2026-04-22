import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function POST(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { assessmentId } = await params;
  const { question_text, marks, options } = await request.json();

  if (!question_text?.trim()) return err("Question text is required");
  if (!Array.isArray(options) || options.length < 2) return err("At least 2 options required");
  if (!options.some((o) => o.is_correct)) return err("At least one correct option required");

  const db = getDb();
  const maxOrder = db.prepare("SELECT MAX(sort_order) as m FROM assessment_questions WHERE assessment_id = ?").get(assessmentId).m || 0;
  const result = db.prepare(`
    INSERT INTO assessment_questions (assessment_id, question_text, marks, sort_order) VALUES (?,?,?,?)
  `).run(assessmentId, question_text.trim(), marks || 1, maxOrder + 1);

  const questionId = result.lastInsertRowid;
  const insertOpt = db.prepare("INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)");
  for (const opt of options) {
    insertOpt.run(questionId, opt.option_text.trim(), opt.is_correct ? 1 : 0);
  }

  const question = db.prepare("SELECT * FROM assessment_questions WHERE id = ?").get(questionId);
  question.options = db.prepare("SELECT * FROM assessment_options WHERE question_id = ?").all(questionId);

  return ok({ question }, 201);
}
