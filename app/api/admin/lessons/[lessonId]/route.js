import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function PUT(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { lessonId } = await params;
  const body = await request.json();
  const { title, description, content_url, duration_minutes, sort_order, is_preview, is_active } = body;

  if (title !== undefined && !title?.trim()) return err("Title is required");

  const db = await getDb();
  const current = (await db.execute({ sql: "SELECT * FROM lessons WHERE id = ?", args: [lessonId] })).rows[0];
  if (!current) return err("Lesson not found", 404);

  await db.execute({
    sql: `UPDATE lessons SET title=?, description=?, content_url=?, duration_minutes=?, sort_order=?, is_preview=?, is_active=? WHERE id=?`,
    args: [
      (title ?? current.title).trim(),
      description !== undefined ? (description || null) : current.description,
      content_url !== undefined ? (content_url || null) : current.content_url,
      duration_minutes !== undefined ? (duration_minutes || null) : current.duration_minutes,
      sort_order !== undefined ? sort_order : current.sort_order,
      is_preview !== undefined ? (is_preview ? 1 : 0) : current.is_preview,
      is_active !== undefined ? (is_active ? 1 : 0) : current.is_active,
      lessonId,
    ],
  });

  const lesson = (await db.execute({ sql: "SELECT * FROM lessons WHERE id = ?", args: [lessonId] })).rows[0];
  return ok({ lesson });
}

export async function DELETE(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { lessonId } = await params;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM lessons WHERE id = ?", args: [lessonId] });
  return ok({ message: "Lesson deleted" });
}
