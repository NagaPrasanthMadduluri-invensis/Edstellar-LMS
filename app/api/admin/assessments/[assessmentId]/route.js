import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { assessmentId } = await params;
  const db = getDb();

  const assessment = db.prepare("SELECT * FROM assessments WHERE id = ?").get(assessmentId);
  if (!assessment) return err("Assessment not found", 404);

  const questions = db.prepare(`
    SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY sort_order
  `).all(assessmentId);

  for (const q of questions) {
    q.options = db.prepare("SELECT * FROM assessment_options WHERE question_id = ?").all(q.id);
  }

  return ok({ assessment, questions });
}

export async function PUT(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { assessmentId } = await params;
  const { title, description, passing_score, is_active } = await request.json();
  if (!title?.trim()) return err("Title is required");

  const db = getDb();
  db.prepare(`
    UPDATE assessments SET title=?, description=?, passing_score=?, is_active=? WHERE id=?
  `).run(title.trim(), description || null, passing_score ?? 60, is_active ? 1 : 0, assessmentId);

  const assessment = db.prepare("SELECT * FROM assessments WHERE id = ?").get(assessmentId);
  return ok({ assessment });
}

export async function DELETE(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { assessmentId } = await params;
  const db = getDb();
  db.prepare("DELETE FROM assessments WHERE id = ?").run(assessmentId);
  return ok({ message: "Assessment deleted" });
}
