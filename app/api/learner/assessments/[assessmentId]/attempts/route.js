import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  if (payload.role !== "learner") return err("Forbidden", 403);

  const { assessmentId } = await params;
  const userId = payload.userId;
  const db = getDb();

  const attempts = db.prepare(`
    SELECT * FROM user_assessment_attempts
    WHERE assessment_id = ? AND user_id = ?
    ORDER BY submitted_at DESC
  `).all(assessmentId, userId);

  return ok({ attempts });
}
