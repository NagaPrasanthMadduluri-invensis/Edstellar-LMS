import { getDb } from "@/lib/db/index.js";
import { requireAdmin, hashPassword, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);

  const db = await getDb();
  const users = (await db.execute(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.is_active, u.created_at,
      (SELECT COUNT(*) FROM user_course_assignments WHERE user_id = u.id) as assigned_courses
    FROM users u WHERE u.role = 'learner' ORDER BY u.created_at DESC
  `)).rows;

  return ok({ users });
}

export async function POST(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);

  const { first_name, last_name, email, password } = await request.json();
  if (!first_name?.trim()) return err("First name is required");
  if (!last_name?.trim()) return err("Last name is required");
  if (!email?.trim()) return err("Email is required");
  if (!password || password.length < 6) return err("Password must be at least 6 characters");

  const db = await getDb();
  const exists = (await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email.toLowerCase().trim()] })).rows[0];
  if (exists) return err("Email already in use", 409);

  const result = await db.execute({
    sql: `INSERT INTO users (first_name, last_name, email, password, role) VALUES (?,?,?,?,'learner')`,
    args: [first_name.trim(), last_name.trim(), email.toLowerCase().trim(), hashPassword(password)],
  });

  const user = (await db.execute({ sql: "SELECT id, first_name, last_name, email, is_active, created_at FROM users WHERE id = ?", args: [result.lastInsertRowid] })).rows[0];
  return ok({ user }, 201);
}
