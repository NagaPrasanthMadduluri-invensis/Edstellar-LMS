import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { courseId } = await params;
  const db = await getDb();

  const assessments = (await db.execute({
    sql: `SELECT a.*,
      (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.id) as questions_count,
      (SELECT COUNT(*) FROM user_assessment_attempts WHERE assessment_id = a.id) as attempts_count
    FROM assessments a WHERE a.course_id = ? ORDER BY a.created_at`,
    args: [courseId],
  })).rows;

  return ok({ assessments });
}

export async function POST(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { courseId } = await params;
  const { title, description, passing_score } = await request.json();
  if (!title?.trim()) return err("Title is required");

  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO assessments (course_id, title, description, passing_score) VALUES (?,?,?,?)`,
    args: [courseId, title.trim(), description || null, passing_score ?? 60],
  });

  const assessment = (await db.execute({ sql: "SELECT * FROM assessments WHERE id = ?", args: [result.lastInsertRowid] })).rows[0];
  return ok({ assessment }, 201);
}
