import { rm } from "fs/promises";
import { join } from "path";
import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { packageId } = await params;
  const db = await getDb();

  const pkg = (await db.execute({
    sql: `SELECT sp.*, c.name AS course_name FROM scorm_packages sp
          LEFT JOIN courses c ON c.id = sp.course_id WHERE sp.id = ?`,
    args: [packageId],
  })).rows[0];
  if (!pkg) return err("Package not found", 404);

  const assignments = (await db.execute({
    sql: `SELECT usa.*, u.first_name, u.last_name, u.email, u.department,
                 st.lesson_status, st.completion_status, st.score_raw, st.updated_at AS last_tracked
          FROM user_scorm_assignments usa
          JOIN users u ON u.id = usa.user_id
          LEFT JOIN scorm_tracking st ON st.user_id = usa.user_id AND st.package_id = usa.package_id
          WHERE usa.package_id = ?
          ORDER BY usa.assigned_at DESC`,
    args: [packageId],
  })).rows;

  return ok({ package: pkg, assignments });
}

export async function DELETE(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { packageId } = await params;
  const db = await getDb();

  const pkg = (await db.execute({
    sql: "SELECT id, package_dir FROM scorm_packages WHERE id = ?",
    args: [packageId],
  })).rows[0];
  if (!pkg) return err("Package not found", 404);

  // Delete from DB (cascades to assignments + tracking)
  await db.execute({ sql: "DELETE FROM scorm_packages WHERE id = ?", args: [packageId] });

  // Delete files
  const dir = join(process.cwd(), "public", "scorm", pkg.package_dir);
  await rm(dir, { recursive: true, force: true }).catch(() => {});

  return ok({ message: "Package deleted" });
}
