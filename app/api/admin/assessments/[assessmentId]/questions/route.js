import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function POST(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { assessmentId } = await params;
  const { question_text, marks, options } = await request.json();

  if (!question_text?.trim()) return err("Question text is required");
  if (!Array.isArray(options) || options.length < 2) return err("At least 2 options required");
  if (!options.some((o) => o.is_correct)) return err("At least one correct option required");

  const db = await getDb();
  const maxOrderRow = (await db.execute({ sql: "SELECT MAX(sort_order) as m FROM assessment_questions WHERE assessment_id = ?", args: [assessmentId] })).rows[0];
  const maxOrder = maxOrderRow.m || 0;
  const result = await db.execute({
    sql: `INSERT INTO assessment_questions (assessment_id, question_text, marks, sort_order) VALUES (?,?,?,?)`,
    args: [assessmentId, question_text.trim(), marks || 1, maxOrder + 1],
  });

  const questionId = result.lastInsertRowid;
  for (const opt of options) {
    await db.execute({
      sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)",
      args: [questionId, opt.option_text.trim(), opt.is_correct ? 1 : 0],
    });
  }

  const question = (await db.execute({ sql: "SELECT * FROM assessment_questions WHERE id = ?", args: [questionId] })).rows[0];
  question.options = (await db.execute({ sql: "SELECT * FROM assessment_options WHERE question_id = ?", args: [questionId] })).rows;

  return ok({ question }, 201);
}
