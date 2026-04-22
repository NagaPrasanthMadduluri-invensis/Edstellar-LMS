import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function PUT(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { moduleId } = await params;
  const { title, description, is_active } = await request.json();
  if (!title?.trim()) return err("Title is required");

  const db = getDb();
  db.prepare(`
    UPDATE course_modules SET title=?, description=?, is_active=? WHERE id=?
  `).run(title.trim(), description || null, is_active ? 1 : 0, moduleId);

  const module = db.prepare("SELECT * FROM course_modules WHERE id = ?").get(moduleId);
  return ok({ module });
}

export async function DELETE(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { moduleId } = await params;
  const db = getDb();
  db.prepare("DELETE FROM course_modules WHERE id = ?").run(moduleId);
  return ok({ message: "Module deleted" });
}
