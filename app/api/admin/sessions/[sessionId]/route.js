import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { sessionId } = await params;
  const db = await getDb();

  const session = (await db.execute({
    sql: `SELECT s.*, c.name as course_name FROM sessions s LEFT JOIN courses c ON c.id = s.course_id WHERE s.id = ?`,
    args: [sessionId],
  })).rows[0];

  if (!session) return err("Session not found", 404);
  return ok({ session });
}

export async function PUT(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return err("Unauthorized", 401);
  const { sessionId } = await params;

  const {
    title, session_type, department, course_id, capacity,
    trainer, venue_url, date, start_time, end_time, description, status,
  } = await request.json();

  if (!title?.trim())      return err("Session title is required");
  if (!trainer?.trim())    return err("Trainer / Facilitator is required");
  if (!venue_url?.trim())  return err("Venue / Platform URL is required");
  if (!date?.trim())       return err("Date is required");
  if (!start_time?.trim()) return err("Start time is required");
  if (!end_time?.trim())   return err("End time is required");

  const db = await getDb();
  await db.execute({
    sql: `UPDATE sessions SET
            title=?, session_type=?, department=?, course_id=?, capacity=?,
            trainer=?, venue_url=?, date=?, start_time=?, end_time=?,
            description=?, status=?
          WHERE id=?`,
    args: [
      title.trim(),
      session_type || "ILT",
      department || null,
      course_id ? Number(course_id) : null,
      capacity ? Number(capacity) : 20,
      trainer.trim(),
      venue_url.trim(),
      date.trim(),
      start_time.trim(),
      end_time.trim(),
      description || null,
      status || "upcoming",
      sessionId,
    ],
  });

  const session = (await db.execute({
    sql: `SELECT s.*, c.name as course_name FROM sessions s LEFT JOIN courses c ON c.id = s.course_id WHERE s.id = ?`,
    args: [sessionId],
  })).rows[0];

  if (!session) return err("Session not found", 404);
  return ok({ session });
}

export async function DELETE(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return err("Unauthorized", 401);
  const { sessionId } = await params;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [sessionId] });
  return ok({ message: "Session deleted" });
}
