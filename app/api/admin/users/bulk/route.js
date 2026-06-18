import { getDb } from "@/lib/db/index.js";
import { requireAdmin, hashPassword, ok, err } from "@/lib/auth.js";

const DEFAULT_PASSWORD = "Edstellar@123";

export async function POST(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);

  const { users } = await request.json();
  if (!Array.isArray(users) || users.length === 0) return err("No users provided", 422);
  if (users.length > 500) return err("Maximum 500 users per upload", 422);

  const db = await getDb();
  let created = 0;
  const failed = [];

  for (let i = 0; i < users.length; i++) {
    const row = users[i];
    const rowNum = i + 1; // 1-indexed data row (after header)

    const employee_id = row.employee_id?.trim() || null;
    const first_name  = row.first_name?.trim();
    const last_name   = row.last_name?.trim();
    const email       = row.email?.trim().toLowerCase();
    const department  = row.department?.trim() || null;
    const location    = row.location?.trim() || null;
    const job_role    = row.job_role?.trim() || null;
    const password    = row.password?.trim() || DEFAULT_PASSWORD;

    if (!first_name) { failed.push({ row: rowNum, email: email || "—", reason: "First name is required" }); continue; }
    if (!last_name)  { failed.push({ row: rowNum, email: email || "—", reason: "Last name is required" });  continue; }
    if (!email)      { failed.push({ row: rowNum, email: "—",          reason: "Email is required" });       continue; }
    if (password.length < 6) { failed.push({ row: rowNum, email, reason: "Password must be at least 6 characters" }); continue; }

    const exists = (await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] })).rows[0];
    if (exists) { failed.push({ row: rowNum, email, reason: "Email already registered" }); continue; }

    try {
      await db.execute({
        sql: `INSERT INTO users (employee_id, first_name, last_name, email, password, role, department, location, job_role)
              VALUES (?,?,?,?,?,'learner',?,?,?)`,
        args: [employee_id, first_name, last_name, email, hashPassword(password), department, location, job_role],
      });
      created++;
    } catch {
      failed.push({ row: rowNum, email, reason: "Database error — could not insert" });
    }
  }

  return ok({ created, failed, total: users.length }, created > 0 ? 201 : 422);
}
