import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function PUT(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { questionId } = await params;
  const { question_text, marks, options } = await request.json();

  if (!question_text?.trim()) return err("Question text is required");
  if (!Array.isArray(options) || options.length < 2) return err("At least 2 options required");
  if (!options.some((o) => o.is_correct)) return err("At least one correct option required");

  const db = await getDb();
  await db.execute({
    sql: "UPDATE assessment_questions SET question_text=?, marks=? WHERE id=?",
    args: [question_text.trim(), marks || 1, questionId],
  });

  // Replace all options
  await db.execute({ sql: "DELETE FROM assessment_options WHERE question_id = ?", args: [questionId] });
  for (const opt of options) {
    await db.execute({
      sql: "INSERT INTO assessment_options (question_id, option_text, is_correct) VALUES (?,?,?)",
      args: [questionId, opt.option_text.trim(), opt.is_correct ? 1 : 0],
    });
  }

  const question = (await db.execute({ sql: "SELECT * FROM assessment_questions WHERE id = ?", args: [questionId] })).rows[0];
  question.options = (await db.execute({ sql: "SELECT * FROM assessment_options WHERE question_id = ?", args: [questionId] })).rows;

  return ok({ question });
}

export async function DELETE(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { questionId } = await params;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM assessment_questions WHERE id = ?", args: [questionId] });
  return ok({ message: "Question deleted" });
}
