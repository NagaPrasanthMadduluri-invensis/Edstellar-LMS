import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const db = await getDb();

  const learners = (await db.execute(
    "SELECT id, first_name, last_name, email, department FROM users WHERE role = 'learner'"
  )).rows;

  let completed = 0, inProgress = 0, notStarted = 0, failed = 0;
  const scores = [];

  const learnerStats = [];

  for (const u of learners) {
    const best = (await db.execute({
      sql: `SELECT MAX(percentage) AS score, MAX(is_passed) AS passed, COUNT(*) AS attempts FROM user_assessment_attempts WHERE user_id = ?`,
      args: [u.id],
    })).rows[0];

    const completedLessons = ((await db.execute({
      sql: `SELECT COUNT(*) AS cnt FROM user_lesson_completions WHERE user_id = ?`,
      args: [u.id],
    })).rows[0]?.cnt) ?? 0;

    let status;
    if (best?.passed === 1) { completed++; status = "completed"; }
    else if (best?.attempts > 0) { failed++; status = "failed"; }
    else if (completedLessons > 0) { inProgress++; status = "in-progress"; }
    else { notStarted++; status = "not-started"; }

    const score = best?.score != null ? Math.round(best.score) : null;
    if (score != null) scores.push(score);

    learnerStats.push({ ...u, status, score });
  }

  const total = learners.length;
  const compRate = total ? Math.round((completed / total) * 100) : 0;
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const passRate = scores.length
    ? Math.round((scores.filter((s) => s >= 60).length / scores.length) * 100)
    : 0;

  const topScorers = learnerStats
    .filter((u) => u.score != null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((u) => ({ id: u.id, name: `${u.first_name} ${u.last_name}`, score: u.score, department: u.department }));

  // Dept completion bar chart data — reuse learnerStats to avoid re-querying
  const depts = [...new Set(learnerStats.map((u) => u.department).filter(Boolean))].sort();

  const deptCompletion = [];
  for (const dept of depts) {
    const deptUsers = learnerStats.filter((u) => u.department === dept);
    const deptTotal = deptUsers.length;
    const deptCompleted = deptUsers.filter((u) => u.status === "completed").length;
    const deptInProgress = deptUsers.filter((u) => u.status === "in-progress").length;

    let totalMinutes = 0;
    for (const u of deptUsers) {
      const row = (await db.execute({
        sql: `SELECT COALESCE(SUM(l.duration_minutes), 0) AS mins
              FROM user_lesson_completions ulc
              JOIN lessons l ON l.id = ulc.lesson_id
              WHERE ulc.user_id = ?`,
        args: [u.id],
      })).rows[0];
      totalMinutes += row?.mins ?? 0;
    }

    const deptScores = deptUsers.filter((u) => u.score != null).map((u) => u.score);
    const avg_score  = deptScores.length
      ? Math.round(deptScores.reduce((a, b) => a + b, 0) / deptScores.length)
      : null;

    deptCompletion.push({
      dept,
      total: deptTotal,
      completed: deptCompleted,
      in_progress: deptInProgress,
      pct: deptTotal ? Math.round((deptCompleted / deptTotal) * 100) : 0,
      in_progress_pct: deptTotal ? Math.round((deptInProgress / deptTotal) * 100) : 0,
      hours_learning: Math.round((totalMinutes / 60) * 10) / 10,
      avg_score,
    });
  }

  // Score distribution bins
  const bins = [0, 0, 0, 0, 0];
  scores.forEach((s) => {
    if (s < 60) bins[0]++;
    else if (s < 70) bins[1]++;
    else if (s < 80) bins[2]++;
    else if (s < 90) bins[3]++;
    else bins[4]++;
  });

  const needsAttention = learnerStats
    .filter((u) => u.status === "not-started")
    .map((u) => ({ id: u.id, name: `${u.first_name} ${u.last_name}`, department: u.department }));

  return ok({
    stats: { total, completed, inProgress, notStarted, failed, compRate, avgScore, passRate },
    statusBreakdown: [
      { status: "Completed", value: completed },
      { status: "In Progress", value: inProgress },
      { status: "Not Started", value: notStarted },
      { status: "Failed", value: failed },
    ],
    scoreBins: [
      { range: "Below 60", count: bins[0] },
      { range: "60–69", count: bins[1] },
      { range: "70–79", count: bins[2] },
      { range: "80–89", count: bins[3] },
      { range: "90–100", count: bins[4] },
    ],
    deptCompletion,
    topScorers,
    needsAttention,
  });
}
