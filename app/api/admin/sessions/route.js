import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const db = await getDb();

  const rows = (await db.execute(`
    SELECT s.*, c.name as course_name,
      (SELECT COUNT(*) FROM session_roster sr WHERE sr.session_id = s.id) as roster_count
    FROM sessions s
    LEFT JOIN courses c ON c.id = s.course_id
    ORDER BY s.date DESC, s.start_time DESC
  `)).rows;

  const sessions = rows.map((s) => ({
    ...s,
    course_id:    s.course_id ? Number(s.course_id) : null,
    capacity:     Number(s.capacity),
    roster_count: Number(s.roster_count || 0),
  }));

  return ok({ sessions });
}

export async function POST(request) {
  const payload = requireAdmin(request);
  if (!payload) return err("Unauthorized", 401);

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
  const result = await db.execute({
    sql: `INSERT INTO sessions
            (title, session_type, department, course_id, capacity, trainer, venue_url, date, start_time, end_time, description, status)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
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
    ],
  });

  const session = (await db.execute({
    sql: `SELECT s.*, c.name as course_name FROM sessions s LEFT JOIN courses c ON c.id = s.course_id WHERE s.id = ?`,
    args: [result.lastInsertRowid],
  })).rows[0];

  return ok({ session }, 201);
}
