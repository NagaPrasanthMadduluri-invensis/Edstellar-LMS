import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

const MONTHLY_GOAL_HOURS = 10;

export async function GET(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const db = await getDb();

  // All learner users
  const learners = (await db.execute(
    "SELECT id, first_name, last_name, department, job_role, location FROM users WHERE role = 'learner' ORDER BY first_name"
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
      job_role: u.job_role || null,
      location: u.location || null,
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

  const WEEK_CASE = `CASE
    WHEN CAST(strftime('%d', %COL%) AS INTEGER) <= 7  THEN 'W1'
    WHEN CAST(strftime('%d', %COL%) AS INTEGER) <= 14 THEN 'W2'
    WHEN CAST(strftime('%d', %COL%) AS INTEGER) <= 21 THEN 'W3'
    ELSE 'W4'
  END`;

  // Weekly trend — hours by department per week (original)
  const weeklyRaw = (await db.execute({
    sql: `SELECT ${WEEK_CASE.replace(/%COL%/g, "ulc.completed_at")} AS week,
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

  const deptWeekMap = {};
  for (const row of weeklyRaw) {
    if (!deptWeekMap[row.week]) deptWeekMap[row.week] = { week: row.week };
    deptWeekMap[row.week][row.dept] = Number(row.hrs);
  }
  const weeklyTrend = ["W1", "W2", "W3", "W4"].map((w) => deptWeekMap[w] || { week: w });

  // Weekly activity — enrollment and completion counts per week this month
  const enrollmentRows = (await db.execute({
    sql: `SELECT ${WEEK_CASE.replace(/%COL%/g, "uca.assigned_at")} AS week,
                 COUNT(DISTINCT uca.user_id) AS cnt
          FROM user_course_assignments uca
          WHERE strftime('%Y-%m', uca.assigned_at) = ?
          GROUP BY week`,
    args: [thisYM],
  })).rows;

  const completionRows = (await db.execute({
    sql: `SELECT ${WEEK_CASE.replace(/%COL%/g, "sub.last_completion")} AS week,
                 COUNT(DISTINCT sub.user_id) AS cnt
          FROM (
            SELECT uca.user_id, uca.course_id,
                   MAX(ulc.completed_at) AS last_completion,
                   COUNT(ulc.id)        AS done_count
            FROM user_course_assignments uca
            JOIN course_modules cm  ON cm.course_id = uca.course_id AND cm.is_active = 1
            JOIN lessons l          ON l.module_id  = cm.id          AND l.is_active  = 1
            JOIN user_lesson_completions ulc ON ulc.lesson_id = l.id AND ulc.user_id = uca.user_id
            GROUP BY uca.user_id, uca.course_id
            HAVING done_count = (
              SELECT COUNT(*) FROM lessons l2
              JOIN course_modules cm2 ON cm2.id = l2.module_id
              WHERE cm2.course_id = uca.course_id AND l2.is_active = 1 AND cm2.is_active = 1
            )
          ) sub
          WHERE strftime('%Y-%m', sub.last_completion) = ?
          GROUP BY week`,
    args: [thisYM],
  })).rows;

  const activityMap = { W1: { week: "W1", Enrollments: 0, Completions: 0 }, W2: { week: "W2", Enrollments: 0, Completions: 0 }, W3: { week: "W3", Enrollments: 0, Completions: 0 }, W4: { week: "W4", Enrollments: 0, Completions: 0 } };
  for (const r of enrollmentRows) activityMap[r.week].Enrollments = Number(r.cnt);
  for (const r of completionRows) activityMap[r.week].Completions = Number(r.cnt);
  const weeklyActivity = ["W1", "W2", "W3", "W4"].map((w) => activityMap[w]);

  // Stats
  const totalHours = Math.round(learnerRows.reduce((s, l) => s + l.thisMonth, 0) * 10) / 10;
  const avgPerLearner = learnerRows.length
    ? Math.round((totalHours / learnerRows.length) * 10) / 10
    : 0;
  const onTrack = learnerRows.filter((l) => l.status === "On Track").length;
  const behindGoal = learnerRows.filter((l) => l.status === "Behind").length;

  return ok({ stats: { totalHours, avgPerLearner, onTrack, behindGoal }, departments, weeklyTrend, weeklyActivity, learners: learnerRows });
}
