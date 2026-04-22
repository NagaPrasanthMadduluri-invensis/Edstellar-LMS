import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { courseId } = await params;
  const db = await getDb();
  const course = (await db.execute({ sql: "SELECT * FROM courses WHERE id = ?", args: [courseId] })).rows[0];
  if (!course) return err("Course not found", 404);
  return ok({ course });
}

export async function PUT(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { courseId } = await params;
  const { name, description, thumbnail_url, is_active } = await request.json();
  if (!name?.trim()) return err("Course name is required");

  const db = await getDb();
  await db.execute({
    sql: `UPDATE courses SET name=?, description=?, thumbnail_url=?, is_active=?, updated_at=datetime('now') WHERE id=?`,
    args: [name.trim(), description || null, thumbnail_url || null, is_active ? 1 : 0, courseId],
  });

  const course = (await db.execute({ sql: "SELECT * FROM courses WHERE id = ?", args: [courseId] })).rows[0];
  return ok({ course });
}

export async function DELETE(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { courseId } = await params;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM courses WHERE id = ?", args: [courseId] });
  return ok({ message: "Course deleted" });
}
