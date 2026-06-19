import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

/* POST  { user_ids: [1,2,3] }  — assign learners to a SCORM package */
export async function POST(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return err("Unauthorized", 401);
  const { packageId } = await params;

  let body;
  try { body = await request.json(); } catch { return err("Invalid body", 400); }

  const { user_ids = [], department } = body;
  const db = await getDb();

  const pkg = (await db.execute({
    sql: "SELECT id FROM scorm_packages WHERE id = ?",
    args: [packageId],
  })).rows[0];
  if (!pkg) return err("Package not found", 404);

  let targets = user_ids;

  // Bulk assign by department
  if (department && targets.length === 0) {
    const users = (await db.execute({
      sql: "SELECT id FROM users WHERE department = ? AND role = 'learner' AND is_active = 1",
      args: [department],
    })).rows;
    targets = users.map((u) => u.id);
  }

  if (targets.length === 0) return err("No learners specified", 422);

  let assigned = 0;
  for (const uid of targets) {
    const res = await db.execute({
      sql: "INSERT OR IGNORE INTO user_scorm_assignments (user_id, package_id, assigned_by) VALUES (?,?,?)",
      args: [uid, packageId, payload.userId],
    });
    if (res.rowsAffected > 0) assigned++;
  }

  return ok({ assigned, total: targets.length });
}

/* DELETE { user_id: 5 } — remove one learner */
export async function DELETE(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { packageId } = await params;

  let body;
  try { body = await request.json(); } catch { return err("Invalid body", 400); }
  const { user_id } = body;
  if (!user_id) return err("user_id required", 422);

  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM user_scorm_assignments WHERE package_id = ? AND user_id = ?",
    args: [packageId, user_id],
  });

  return ok({ message: "Learner removed from package" });
}
