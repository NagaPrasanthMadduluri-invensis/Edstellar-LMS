import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { moduleId } = await params;
  const db = await getDb();
  const lessons = (await db.execute({
    sql: `SELECT * FROM lessons WHERE module_id = ? ORDER BY sort_order, created_at`,
    args: [moduleId],
  })).rows;
  return ok({ lessons });
}

export async function POST(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { moduleId } = await params;
  const { title, description, content_type, content_url, scorm_package_id, duration_minutes, sort_order, is_preview, is_active } = await request.json();
  if (!title?.trim()) return err("Title is required");

  const db = await getDb();
  const maxOrderRow = (await db.execute({ sql: "SELECT MAX(sort_order) as m FROM lessons WHERE module_id = ?", args: [moduleId] })).rows[0];
  const maxOrder = maxOrderRow.m || 0;
  const result = await db.execute({
    sql: `INSERT INTO lessons (module_id, title, description, content_type, content_url, scorm_package_id, duration_minutes, sort_order, is_preview, is_active) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    args: [
      moduleId, title.trim(), description || null,
      content_type || "video",
      content_type === "scorm" ? null : (content_url || null),
      content_type === "scorm" ? (scorm_package_id || null) : null,
      duration_minutes || null,
      sort_order ?? maxOrder + 1,
      is_preview ? 1 : 0,
      is_active !== false ? 1 : 0,
    ],
  });

  const lesson = (await db.execute({ sql: "SELECT * FROM lessons WHERE id = ?", args: [result.lastInsertRowid] })).rows[0];
  return ok({ lesson }, 201);
}
