import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { sessionId } = await params;
  const db = await getDb();

  const rows = (await db.execute({
    sql: `SELECT u.id, u.first_name, u.last_name, u.email, u.department,
                 sa.status, sa.join_time, sa.notes, sa.is_locked, sa.marked_by,
                 mu.first_name as marker_first, mu.last_name as marker_last
          FROM session_roster sr
          JOIN users u ON u.id = sr.user_id
          LEFT JOIN session_attendance sa ON sa.session_id = sr.session_id AND sa.user_id = sr.user_id
          LEFT JOIN users mu ON mu.id = sa.marked_by
          WHERE sr.session_id = ?
          ORDER BY u.first_name`,
    args: [sessionId],
  })).rows;

  const is_locked = rows.some((r) => Number(r.is_locked) === 1);

  const records = rows.map((r) => ({
    user_id:      Number(r.id),
    first_name:   r.first_name,
    last_name:    r.last_name,
    email:        r.email,
    department:   r.department,
    status:       r.status || null,
    join_time:    r.join_time || "",
    notes:        r.notes || "",
    is_locked:    Number(r.is_locked) === 1,
    marked_by:    r.marked_by ? Number(r.marked_by) : null,
    marker_name:  r.marker_first ? `${r.marker_first} ${r.marker_last}` : null,
  }));

  return ok({ records, is_locked });
}

export async function PUT(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return err("Unauthorized", 401);
  const { sessionId } = await params;
  const { records = [], lock = false } = await request.json();
  const db = await getDb();
  const isLocked = lock ? 1 : 0;

  for (const rec of records) {
    await db.execute({
      sql: `INSERT INTO session_attendance (session_id, user_id, status, join_time, notes, marked_by, is_locked, marked_at)
            VALUES (?,?,?,?,?,?,?,datetime('now'))
            ON CONFLICT(session_id, user_id) DO UPDATE SET
              status    = excluded.status,
              join_time = excluded.join_time,
              notes     = excluded.notes,
              marked_by = excluded.marked_by,
              is_locked = excluded.is_locked,
              marked_at = excluded.marked_at`,
      args: [
        sessionId,
        rec.user_id,
        rec.status || null,
        rec.join_time || null,
        rec.notes || null,
        payload.id,
        isLocked,
      ],
    });
  }

  // Re-fetch updated records
  const rows = (await db.execute({
    sql: `SELECT u.id, u.first_name, u.last_name, u.email, u.department,
                 sa.status, sa.join_time, sa.notes, sa.is_locked, sa.marked_by,
                 mu.first_name as marker_first, mu.last_name as marker_last
          FROM session_roster sr
          JOIN users u ON u.id = sr.user_id
          LEFT JOIN session_attendance sa ON sa.session_id = sr.session_id AND sa.user_id = sr.user_id
          LEFT JOIN users mu ON mu.id = sa.marked_by
          WHERE sr.session_id = ?
          ORDER BY u.first_name`,
    args: [sessionId],
  })).rows;

  const is_locked = rows.some((r) => Number(r.is_locked) === 1);
  const updatedRecords = rows.map((r) => ({
    user_id:     Number(r.id),
    first_name:  r.first_name,
    last_name:   r.last_name,
    email:       r.email,
    department:  r.department,
    status:      r.status || null,
    join_time:   r.join_time || "",
    notes:       r.notes || "",
    is_locked:   Number(r.is_locked) === 1,
    marked_by:   r.marked_by ? Number(r.marked_by) : null,
    marker_name: r.marker_first ? `${r.marker_first} ${r.marker_last}` : null,
  }));

  return ok({ records: updatedRecords, is_locked });
}
