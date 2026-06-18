import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const db = await getDb();

  const learners = (await db.execute(
    "SELECT id, first_name, last_name, department, job_role, location FROM users WHERE role = 'learner'"
  )).rows;

  const thisYM = "2026-06";

  const rows = [];

  for (const u of learners) {
    // All-time hours
    const allTime = Number((await db.execute({
      sql: `SELECT COALESCE(ROUND(SUM(l.duration_minutes) / 60.0, 1), 0) AS hrs
            FROM user_lesson_completions ulc JOIN lessons l ON l.id = ulc.lesson_id
            WHERE ulc.user_id = ?`,
      args: [u.id],
    })).rows[0]?.hrs ?? 0);

    // This month hours
    const thisMonth = Number((await db.execute({
      sql: `SELECT COALESCE(ROUND(SUM(l.duration_minutes) / 60.0, 1), 0) AS hrs
            FROM user_lesson_completions ulc JOIN lessons l ON l.id = ulc.lesson_id
            WHERE ulc.user_id = ? AND strftime('%Y-%m', ulc.completed_at) = ?`,
      args: [u.id, thisYM],
    })).rows[0]?.hrs ?? 0);

    // Completion % = completed lessons / total lessons in assigned courses
    const completedCount = Number((await db.execute({
      sql: `SELECT COUNT(*) AS cnt FROM user_lesson_completions WHERE user_id = ?`,
      args: [u.id],
    })).rows[0]?.cnt ?? 0);

    const totalAssigned = Number((await db.execute({
      sql: `SELECT COUNT(DISTINCT l.id) AS cnt
            FROM user_course_assignments uca
            JOIN course_modules cm ON cm.course_id = uca.course_id
            JOIN lessons l ON l.module_id = cm.id
            WHERE uca.user_id = ?`,
      args: [u.id],
    })).rows[0]?.cnt ?? 0);

    const completionPct = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

    // Best assessment score
    const bestScore = (await db.execute({
      sql: `SELECT MAX(percentage) AS score FROM user_assessment_attempts WHERE user_id = ?`,
      args: [u.id],
    })).rows[0]?.score ?? 0;

    rows.push({ id: u.id, name: `${u.first_name} ${u.last_name}`, dept: u.department, job_role: u.job_role || null, location: u.location || null, thisMonth, allTime, completionPct, assessScore: Number(bestScore) });
  }

  // Normalise allTime hours for composite score
  const maxAllTime = Math.max(...rows.map((r) => r.allTime), 1);
  const ranked = rows
    .map((r) => ({
      ...r,
      score: Math.round(r.completionPct * 0.6 + (r.allTime / maxAllTime) * 100 * 0.4),
    }))
    .sort((a, b) => b.score - a.score);

  const totalLearners = ranked.length;
  const avgHours = totalLearners ? Math.round((rows.reduce((s, r) => s + r.thisMonth, 0) / totalLearners) * 10) / 10 : 0;
  const avgCompletion = totalLearners ? Math.round(rows.reduce((s, r) => s + r.completionPct, 0) / totalLearners) : 0;

  return ok({
    stats: { totalLearners, avgHours, avgCompletion, topName: ranked[0]?.name ?? "", topDept: ranked[0]?.dept ?? "" },
    learners: ranked,
  });
}
