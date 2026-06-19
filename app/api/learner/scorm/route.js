import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);

  const db = await getDb();

  const packages = (await db.execute({
    sql: `SELECT sp.id, sp.title, sp.version, sp.entry_point, sp.package_dir,
                 sp.created_at,
                 c.name AS course_name,
                 usa.assigned_at,
                 st.lesson_status, st.completion_status, st.success_status,
                 st.score_raw, st.score_max, st.total_time, st.updated_at AS last_tracked
          FROM user_scorm_assignments usa
          JOIN scorm_packages sp ON sp.id = usa.package_id AND sp.is_active = 1
          LEFT JOIN courses c ON c.id = sp.course_id
          LEFT JOIN scorm_tracking st ON st.package_id = sp.id AND st.user_id = usa.user_id
          WHERE usa.user_id = ?
          ORDER BY usa.assigned_at DESC`,
    args: [payload.userId],
  })).rows;

  return ok({ packages });
}
