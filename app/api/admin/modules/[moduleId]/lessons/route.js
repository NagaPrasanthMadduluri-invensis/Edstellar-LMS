import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { moduleId } = await params;
  const db = getDb();
  const lessons = db.prepare(`
    SELECT * FROM lessons WHERE module_id = ? ORDER BY sort_order, created_at
  `).all(moduleId);
  return ok({ lessons });
}

export async function POST(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { moduleId } = await params;
  const { title, description, content_url, duration_minutes, sort_order, is_preview, is_active } = await request.json();
  if (!title?.trim()) return err("Title is required");

  const db = getDb();
  const maxOrder = db.prepare("SELECT MAX(sort_order) as m FROM lessons WHERE module_id = ?").get(moduleId).m || 0;
  const result = db.prepare(`
    INSERT INTO lessons (module_id, title, description, content_type, content_url, duration_minutes, sort_order, is_preview, is_active)
    VALUES (?,?,?,'video',?,?,?,?,?)
  `).run(
    moduleId, title.trim(), description || null, content_url || null,
    duration_minutes || null,
    sort_order ?? maxOrder + 1,
    is_preview ? 1 : 0,
    is_active !== false ? 1 : 0,
  );

  const lesson = db.prepare("SELECT * FROM lessons WHERE id = ?").get(result.lastInsertRowid);
  return ok({ lesson }, 201);
}
