import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

async function getRosterData(db, sessionId) {
  const enrolled = (await db.execute({
    sql: `SELECT u.id, u.first_name, u.last_name, u.email, u.department
          FROM session_roster sr JOIN users u ON u.id = sr.user_id
          WHERE sr.session_id = ? AND u.role = 'learner'
          ORDER BY u.first_name`,
    args: [sessionId],
  })).rows;

  const available = (await db.execute({
    sql: `SELECT u.id, u.first_name, u.last_name, u.email, u.department
          FROM users u
          WHERE u.role = 'learner' AND u.is_active = 1
            AND u.id NOT IN (SELECT user_id FROM session_roster WHERE session_id = ?)
          ORDER BY u.first_name`,
    args: [sessionId],
  })).rows;

  return { enrolled, available };
}

export async function GET(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { sessionId } = await params;
  const db = await getDb();
  return ok(await getRosterData(db, sessionId));
}

export async function POST(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { sessionId } = await params;
  const body = await request.json();
  const db = await getDb();

  if (body.enroll_all && body.department) {
    const users = (await db.execute({
      sql: `SELECT id FROM users WHERE role = 'learner' AND is_active = 1 AND department = ?
            AND id NOT IN (SELECT user_id FROM session_roster WHERE session_id = ?)`,
      args: [body.department, sessionId],
    })).rows;
    for (const u of users) {
      await db.execute({ sql: "INSERT OR IGNORE INTO session_roster (session_id, user_id) VALUES (?,?)", args: [sessionId, u.id] });
    }
  } else if (body.user_id) {
    await db.execute({ sql: "INSERT OR IGNORE INTO session_roster (session_id, user_id) VALUES (?,?)", args: [sessionId, body.user_id] });
  } else {
    return err("user_id or enroll_all+department required");
  }

  return ok(await getRosterData(db, sessionId));
}

export async function DELETE(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { sessionId } = await params;
  const { user_id } = await request.json();
  if (!user_id) return err("user_id required");
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM session_roster WHERE session_id = ? AND user_id = ?", args: [sessionId, user_id] });
  return ok(await getRosterData(db, sessionId));
}
