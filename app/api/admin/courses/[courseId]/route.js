import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { courseId } = await params;
  const db = getDb();
  const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(courseId);
  if (!course) return err("Course not found", 404);
  return ok({ course });
}

export async function PUT(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { courseId } = await params;
  const { name, description, thumbnail_url, is_active } = await request.json();
  if (!name?.trim()) return err("Course name is required");

  const db = getDb();
  db.prepare(`
    UPDATE courses SET name=?, description=?, thumbnail_url=?, is_active=?, updated_at=datetime('now')
    WHERE id=?
  `).run(name.trim(), description || null, thumbnail_url || null, is_active ? 1 : 0, courseId);

  const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(courseId);
  return ok({ course });
}

export async function DELETE(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { courseId } = await params;
  const db = getDb();
  db.prepare("DELETE FROM courses WHERE id = ?").run(courseId);
  return ok({ message: "Course deleted" });
}
