import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { courseId } = await params;
  const db = getDb();

  const assessments = db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.id) as questions_count,
      (SELECT COUNT(*) FROM user_assessment_attempts WHERE assessment_id = a.id) as attempts_count
    FROM assessments a WHERE a.course_id = ? ORDER BY a.created_at
  `).all(courseId);

  return ok({ assessments });
}

export async function POST(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { courseId } = await params;
  const { title, description, passing_score } = await request.json();
  if (!title?.trim()) return err("Title is required");

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO assessments (course_id, title, description, passing_score) VALUES (?,?,?,?)
  `).run(courseId, title.trim(), description || null, passing_score ?? 60);

  const assessment = db.prepare("SELECT * FROM assessments WHERE id = ?").get(result.lastInsertRowid);
  return ok({ assessment }, 201);
}
