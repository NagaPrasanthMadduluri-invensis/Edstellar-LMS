import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { courseId } = await params;
  const db = getDb();

  const modules = db.prepare(`
    SELECT cm.*,
      (SELECT COUNT(*) FROM lessons WHERE module_id = cm.id AND is_active = 1) as lessons_count
    FROM course_modules cm WHERE cm.course_id = ? ORDER BY cm.sort_order, cm.created_at
  `).all(courseId);

  for (const m of modules) {
    m.lessons = db.prepare(`
      SELECT * FROM lessons WHERE module_id = ? AND is_active = 1 ORDER BY sort_order, created_at
    `).all(m.id);
  }

  return ok({ modules });
}

export async function POST(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { courseId } = await params;
  const { title, description } = await request.json();
  if (!title?.trim()) return err("Title is required");

  const db = getDb();
  const maxOrder = db.prepare("SELECT MAX(sort_order) as m FROM course_modules WHERE course_id = ?").get(courseId).m || 0;
  const result = db.prepare(`
    INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)
  `).run(courseId, title.trim(), description || null, maxOrder + 1);

  const module = db.prepare("SELECT * FROM course_modules WHERE id = ?").get(result.lastInsertRowid);
  return ok({ module }, 201);
}
