import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const db = getDb();

  const assessments = db.prepare(`
    SELECT a.*, c.name AS course_name,
           COUNT(aq.id) AS question_count
    FROM assessments a
    JOIN courses c ON c.id = a.course_id
    LEFT JOIN assessment_questions aq ON aq.assessment_id = a.id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `).all();

  return ok({ assessments: assessments.map((a) => ({ ...a, is_active: a.is_active === 1 })) });
}
