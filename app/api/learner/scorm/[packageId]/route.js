import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);

  const { packageId } = await params;
  const db = await getDb();

  const pkg = (await db.execute({
    sql: `SELECT sp.id, sp.title, sp.version, sp.entry_point, sp.package_dir,
                 c.name AS course_name
          FROM scorm_packages sp
          LEFT JOIN courses c ON c.id = sp.course_id
          WHERE sp.id = ? AND sp.is_active = 1
            AND (
              EXISTS (SELECT 1 FROM user_scorm_assignments WHERE user_id = ? AND package_id = sp.id)
              OR
              EXISTS (
                SELECT 1 FROM lessons l
                JOIN course_modules cm ON cm.id = l.module_id
                JOIN user_course_assignments uca ON uca.course_id = cm.course_id
                WHERE l.scorm_package_id = sp.id AND uca.user_id = ?
              )
            )
          LIMIT 1`,
    args: [packageId, payload.userId, payload.userId],
  })).rows[0];

  if (!pkg) return err("Package not found or not assigned", 404);

  return ok({ package: pkg });
}
