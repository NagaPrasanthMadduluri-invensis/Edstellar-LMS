import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);

  const db = await getDb();

  const rows = (await db.execute({
    sql: `SELECT s.id, s.title, s.session_type, s.department, s.date,
                 s.start_time, s.end_time, s.trainer, s.venue_url,
                 s.description, s.status, s.capacity,
                 c.name AS course_name,
                 sa.status AS attendance_status
          FROM session_roster sr
          JOIN sessions s ON s.id = sr.session_id
          LEFT JOIN courses c ON c.id = s.course_id
          LEFT JOIN session_attendance sa
            ON sa.session_id = sr.session_id AND sa.user_id = sr.user_id
          WHERE sr.user_id = ?
          ORDER BY s.date ASC, s.start_time ASC`,
    args: [payload.userId],
  })).rows;

  return ok({ sessions: rows });
}
