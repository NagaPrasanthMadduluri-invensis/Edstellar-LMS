import { getDb } from "@/lib/db/index.js";
import { requireAdmin, hashPassword, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);

  const db = getDb();
  const users = db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.is_active, u.created_at,
      (SELECT COUNT(*) FROM user_course_assignments WHERE user_id = u.id) as assigned_courses
    FROM users u WHERE u.role = 'learner' ORDER BY u.created_at DESC
  `).all();

  return ok({ users });
}

export async function POST(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);

  const { first_name, last_name, email, password } = await request.json();
  if (!first_name?.trim()) return err("First name is required");
  if (!last_name?.trim()) return err("Last name is required");
  if (!email?.trim()) return err("Email is required");
  if (!password || password.length < 6) return err("Password must be at least 6 characters");

  const db = getDb();
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase().trim());
  if (exists) return err("Email already in use", 409);

  const result = db.prepare(`
    INSERT INTO users (first_name, last_name, email, password, role) VALUES (?,?,?,?,'learner')
  `).run(first_name.trim(), last_name.trim(), email.toLowerCase().trim(), hashPassword(password));

  const user = db.prepare("SELECT id, first_name, last_name, email, is_active, created_at FROM users WHERE id = ?").get(result.lastInsertRowid);
  return ok({ user }, 201);
}
