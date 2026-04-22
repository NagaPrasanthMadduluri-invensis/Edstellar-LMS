import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { courseId } = await params;
  const db = await getDb();

  const modules = (await db.execute({
    sql: `SELECT cm.*,
      (SELECT COUNT(*) FROM lessons WHERE module_id = cm.id AND is_active = 1) as lessons_count
    FROM course_modules cm WHERE cm.course_id = ? ORDER BY cm.sort_order, cm.created_at`,
    args: [courseId],
  })).rows;

  for (const m of modules) {
    m.lessons = (await db.execute({
      sql: `SELECT * FROM lessons WHERE module_id = ? AND is_active = 1 ORDER BY sort_order, created_at`,
      args: [m.id],
    })).rows;
  }

  return ok({ modules });
}

export async function POST(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { courseId } = await params;
  const { title, description } = await request.json();
  if (!title?.trim()) return err("Title is required");

  const db = await getDb();
  const maxOrderRow = (await db.execute({ sql: "SELECT MAX(sort_order) as m FROM course_modules WHERE course_id = ?", args: [courseId] })).rows[0];
  const maxOrder = maxOrderRow.m || 0;
  const result = await db.execute({
    sql: `INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)`,
    args: [courseId, title.trim(), description || null, maxOrder + 1],
  });

  const module = (await db.execute({ sql: "SELECT * FROM course_modules WHERE id = ?", args: [result.lastInsertRowid] })).rows[0];
  return ok({ module }, 201);
}
