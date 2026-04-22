import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { assessmentId } = await params;
  const db = await getDb();

  const assessment = (await db.execute({ sql: "SELECT * FROM assessments WHERE id = ?", args: [assessmentId] })).rows[0];
  if (!assessment) return err("Assessment not found", 404);

  const questions = (await db.execute({
    sql: `SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY sort_order`,
    args: [assessmentId],
  })).rows;

  for (const q of questions) {
    q.options = (await db.execute({ sql: "SELECT * FROM assessment_options WHERE question_id = ?", args: [q.id] })).rows;
  }

  return ok({ assessment, questions });
}

export async function PUT(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { assessmentId } = await params;
  const { title, description, passing_score, is_active } = await request.json();
  if (!title?.trim()) return err("Title is required");

  const db = await getDb();
  await db.execute({
    sql: `UPDATE assessments SET title=?, description=?, passing_score=?, is_active=? WHERE id=?`,
    args: [title.trim(), description || null, passing_score ?? 60, is_active ? 1 : 0, assessmentId],
  });

  const assessment = (await db.execute({ sql: "SELECT * FROM assessments WHERE id = ?", args: [assessmentId] })).rows[0];
  return ok({ assessment });
}

export async function DELETE(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { assessmentId } = await params;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM assessments WHERE id = ?", args: [assessmentId] });
  return ok({ message: "Assessment deleted" });
}
