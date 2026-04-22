import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function PUT(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { moduleId } = await params;
  const { title, description, is_active } = await request.json();
  if (!title?.trim()) return err("Title is required");

  const db = await getDb();
  await db.execute({
    sql: `UPDATE course_modules SET title=?, description=?, is_active=? WHERE id=?`,
    args: [title.trim(), description || null, is_active ? 1 : 0, moduleId],
  });

  const module = (await db.execute({ sql: "SELECT * FROM course_modules WHERE id = ?", args: [moduleId] })).rows[0];
  return ok({ module });
}

export async function DELETE(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { moduleId } = await params;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM course_modules WHERE id = ?", args: [moduleId] });
  return ok({ message: "Module deleted" });
}
