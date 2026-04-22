import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const db = getDb();

  const depts = db.prepare(`
    SELECT DISTINCT department FROM users
    WHERE role = 'learner' AND department IS NOT NULL
    ORDER BY department
  `).all().map((r) => r.department);

  const departments = depts.map((dept) => {
    const users = db.prepare(
      "SELECT id FROM users WHERE role = 'learner' AND department = ?"
    ).all(dept);

    const total = users.length;
    let completed = 0, in_progress = 0, not_started = 0, failed = 0;
    const scores = [];

    users.forEach(({ id }) => {
      const best = db.prepare(`
        SELECT MAX(percentage) AS score, MAX(is_passed) AS passed, COUNT(*) AS attempts
        FROM user_assessment_attempts WHERE user_id = ?
      `).get(id);

      const completedLessons = db.prepare(`
        SELECT COUNT(*) AS cnt FROM user_lesson_completions WHERE user_id = ?
      `).get(id)?.cnt ?? 0;

      if (best?.passed === 1) {
        completed++;
        if (best.score != null) scores.push(best.score);
      } else if (best?.attempts > 0) {
        failed++;
        if (best.score != null) scores.push(best.score);
      } else if (completedLessons > 0) {
        in_progress++;
      } else {
        not_started++;
      }
    });

    const avg_score = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
    const completion_pct = total ? Math.round((completed / total) * 100) : 0;

    return { dept, total, completed, in_progress, not_started, failed, avg_score, completion_pct };
  });

  return ok({ departments });
}
