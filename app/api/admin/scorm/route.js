import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const db = await getDb();

  const packages = (await db.execute(`
    SELECT sp.*,
      (SELECT COUNT(*) FROM user_scorm_assignments WHERE package_id = sp.id) AS assigned_count,
      (SELECT COUNT(*) FROM scorm_tracking
        WHERE package_id = sp.id
          AND (lesson_status IN ('passed','completed') OR completion_status = 'completed')
      ) AS completed_count,
      c.name AS course_name
    FROM scorm_packages sp
    LEFT JOIN courses c ON c.id = sp.course_id
    ORDER BY sp.created_at DESC
  `)).rows;

  return ok({ packages });
}
