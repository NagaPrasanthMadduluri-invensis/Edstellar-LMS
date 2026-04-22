import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);

  const db = await getDb();
  const courses = (await db.execute(`
    SELECT
      c.*,
      (SELECT COUNT(*) FROM course_modules WHERE course_id = c.id AND is_active = 1) as modules_count,
      (SELECT COUNT(*) FROM lessons l JOIN course_modules cm ON cm.id = l.module_id WHERE cm.course_id = c.id AND l.is_active = 1) as lessons_count,
      (SELECT COUNT(*) FROM assessments WHERE course_id = c.id AND is_active = 1) as assessments_count,
      (SELECT COUNT(*) FROM user_course_assignments WHERE course_id = c.id) as enrollments_count,
      (SELECT COALESCE(SUM(l.duration_minutes), 0) FROM lessons l JOIN course_modules cm ON cm.id = l.module_id WHERE cm.course_id = c.id AND l.is_active = 1 AND cm.is_active = 1) as total_duration_minutes,
      (SELECT MIN(a.passing_score) FROM assessments a WHERE a.course_id = c.id AND a.is_active = 1) as passing_score
    FROM courses c ORDER BY c.created_at DESC
  `)).rows;

  return ok({ courses });
}

export async function POST(request) {
  const payload = requireAdmin(request);
  if (!payload) return err("Unauthorized", 401);

  const { name, description, thumbnail_url } = await request.json();
  if (!name?.trim()) return err("Course name is required");

  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO courses (name, description, thumbnail_url) VALUES (?, ?, ?)`,
    args: [name.trim(), description || null, thumbnail_url || null],
  });

  const course = (await db.execute({ sql: "SELECT * FROM courses WHERE id = ?", args: [result.lastInsertRowid] })).rows[0];
  return ok({ course }, 201);
}
