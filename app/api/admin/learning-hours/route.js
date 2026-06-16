import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

const MONTHLY_GOAL_HOURS = 10;

export async function GET(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const db = await getDb();

  // All learner users
  const learners = (await db.execute(
    "SELECT id, first_name, last_name, department FROM users WHERE role = 'learner' ORDER BY first_name"
  )).rows;

  const now = new Date("2026-06-15");
  const thisYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastYM = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, "0")}`;

  const learnerRows = [];

  for (const u of learners) {
    const thisMonth = (await db.execute({
      sql: `SELECT COALESCE(ROUND(SUM(l.duration_minutes) / 60.0, 1), 0) AS hrs
            FROM user_lesson_completions ulc
            JOIN lessons l ON l.id = ulc.lesson_id
            WHERE ulc.user_id = ? AND strftime('%Y-%m', ulc.completed_at) = ?`,
      args: [u.id, thisYM],
    })).rows[0]?.hrs ?? 0;

    const lastMonth = (await db.execute({
      sql: `SELECT COALESCE(ROUND(SUM(l.duration_minutes) / 60.0, 1), 0) AS hrs
            FROM user_lesson_completions ulc
            JOIN lessons l ON l.id = ulc.lesson_id
            WHERE ulc.user_id = ? AND strftime('%Y-%m', ulc.completed_at) = ?`,
      args: [u.id, lastYM],
    })).rows[0]?.hrs ?? 0;

    const allTime = (await db.execute({
      sql: `SELECT COALESCE(ROUND(SUM(l.duration_minutes) / 60.0, 1), 0) AS hrs
            FROM user_lesson_completions ulc
            JOIN lessons l ON l.id = ulc.lesson_id
            WHERE ulc.user_id = ?`,
      args: [u.id],
    })).rows[0]?.hrs ?? 0;

    const progressPct = Math.min(Math.round((thisMonth / MONTHLY_GOAL_HOURS) * 100), 150);
    const status = progressPct >= 100 ? "On Track" : progressPct >= 60 ? "Close" : "Behind";

    learnerRows.push({
      id: u.id,
      name: `${u.first_name} ${u.last_name}`,
      dept: u.department,
      thisMonth: Number(thisMonth),
      lastMonth: Number(lastMonth),
      goal: MONTHLY_GOAL_HOURS,
      progressPct,
      allTime: Number(allTime),
      status,
    });
  }

  // Sort by thisMonth desc
  learnerRows.sort((a, b) => b.thisMonth - a.thisMonth);

  // Department breakdown
  const depts = [...new Set(learnerRows.map((l) => l.dept).filter(Boolean))].sort();
  const departments = depts.map((dept) => {
    const dl = learnerRows.filter((l) => l.dept === dept);
    const totalHours = Math.round(dl.reduce((s, l) => s + l.thisMonth, 0) * 10) / 10;
    const avgHours = dl.length ? Math.round((totalHours / dl.length) * 10) / 10 : 0;
    const onTrack = dl.filter((l) => l.status === "On Track").length;
    return { dept, totalHours, learners: dl.length, avgHours, onTrack };
  });

  // Weekly trend — June only, group by week
  const weeklyRaw = (await db.execute({
    sql: `SELECT
            CASE
              WHEN CAST(strftime('%d', ulc.completed_at) AS INTEGER) <= 7  THEN 'W1'
              WHEN CAST(strftime('%d', ulc.completed_at) AS INTEGER) <= 14 THEN 'W2'
              WHEN CAST(strftime('%d', ulc.completed_at) AS INTEGER) <= 21 THEN 'W3'
              ELSE 'W4'
            END AS week,
            u.department AS dept,
            ROUND(SUM(l.duration_minutes) / 60.0, 1) AS hrs
          FROM user_lesson_completions ulc
          JOIN users u ON u.id = ulc.user_id
          JOIN lessons l ON l.id = ulc.lesson_id
          WHERE u.role = 'learner'
            AND strftime('%Y-%m', ulc.completed_at) = ?
            AND u.department IS NOT NULL
          GROUP BY week, u.department
          ORDER BY week, u.department`,
    args: [thisYM],
  })).rows;

  // Pivot to { week, Dept1: hrs, Dept2: hrs, ... }
  const weekMap = {};
  for (const row of weeklyRaw) {
    if (!weekMap[row.week]) weekMap[row.week] = { week: row.week };
    weekMap[row.week][row.dept] = Number(row.hrs);
  }
  const weeklyTrend = ["W1", "W2", "W3", "W4"].map((w) => weekMap[w] || { week: w });

  // Stats
  const totalHours = Math.round(learnerRows.reduce((s, l) => s + l.thisMonth, 0) * 10) / 10;
  const avgPerLearner = learnerRows.length
    ? Math.round((totalHours / learnerRows.length) * 10) / 10
    : 0;
  const onTrack = learnerRows.filter((l) => l.status === "On Track").length;
  const behindGoal = learnerRows.filter((l) => l.status === "Behind").length;

  return ok({ stats: { totalHours, avgPerLearner, onTrack, behindGoal }, departments, weeklyTrend, learners: learnerRows });
}
