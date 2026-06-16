import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

const THIS_YM  = "2026-06";
const LAST_YM  = "2026-05";
const GOAL_H   = 10;

/* Week boundaries for June 2026 */
const WEEKS = [
  { label: "Jun W1", start: "2026-06-01", end: "2026-06-07" },
  { label: "Jun W2", start: "2026-06-08", end: "2026-06-14" },
  { label: "Jun W3", start: "2026-06-15", end: "2026-06-21" },
  { label: "Jun W4", start: "2026-06-22", end: "2026-06-30" },
];

/* Training mode assigned per course (synthetic since DB has no content_type) */
const COURSE_MODE = {
  1: { mode: "eLearning / SCORM", color: "#f59e0b" },
  2: { mode: "Video / Self-paced", color: "#10b981" },
  3: { mode: "VILT – Virtual Live", color: "#6366f1" },
  4: { mode: "ILT – In-Person",    color: "#374151" },
};

const MODE_ORDER = [
  "ILT – In-Person",
  "VILT – Virtual Live",
  "Webinar",
  "eLearning / SCORM",
  "Video / Self-paced",
];

async function getMonthHours(db, userId, ym) {
  const row = (await db.execute({
    sql: `SELECT COALESCE(ROUND(SUM(l.duration_minutes)/60.0,1),0) AS hrs
          FROM user_lesson_completions ulc
          JOIN lessons l ON l.id = ulc.lesson_id
          WHERE ulc.user_id = ? AND strftime('%Y-%m', ulc.completed_at) = ?`,
    args: [userId, ym],
  })).rows[0];
  return Number(row.hrs);
}

async function getAllTimeHours(db, userId) {
  const row = (await db.execute({
    sql: `SELECT COALESCE(ROUND(SUM(l.duration_minutes)/60.0,1),0) AS hrs
          FROM user_lesson_completions ulc
          JOIN lessons l ON l.id = ulc.lesson_id
          WHERE ulc.user_id = ?`,
    args: [userId],
  })).rows[0];
  return Number(row.hrs);
}

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  if (payload.role !== "learner") return err("Forbidden", 403);

  const db     = await getDb();
  const userId = payload.userId;

  /* ── current user info ── */
  const meRow = (await db.execute({
    sql: "SELECT id, first_name, last_name, department FROM users WHERE id = ?",
    args: [userId],
  })).rows[0];
  const myDept = meRow?.department || "Unknown";

  /* ── my hours ── */
  const thisMonth  = await getMonthHours(db, userId, THIS_YM);
  const lastMonth  = await getMonthHours(db, userId, LAST_YM);
  const allTime    = await getAllTimeHours(db, userId);
  const goalPct    = Math.min(Math.round((thisMonth / GOAL_H) * 100), 100);
  const remaining  = Math.max(0, Math.round((GOAL_H - thisMonth) * 10) / 10);
  const diff       = Math.round((thisMonth - lastMonth) * 10) / 10;

  /* ── all learners for ranking & org overview ── */
  const allLearners = (await db.execute(
    "SELECT id, first_name, last_name, department FROM users WHERE role = 'learner'"
  )).rows;

  /* ── dept peers this month ── */
  const deptPeers = allLearners.filter((u) => u.department === myDept);

  const peersWithHours = await Promise.all(
    deptPeers.map(async (u) => {
      const tm  = await getMonthHours(db, u.id, THIS_YM);
      const lm  = await getMonthHours(db, u.id, LAST_YM);
      const at  = await getAllTimeHours(db, u.id);
      const gp  = Math.min(Math.round((tm / GOAL_H) * 100), 100);
      const st  = gp >= 100 ? "On Track" : gp >= 60 ? "Close" : "Behind";
      return { id: u.id, name: `${u.first_name} ${u.last_name}`, dept: u.department, thisMonth: tm, lastMonth: lm, allTime: at, goalPct: gp, status: st, isYou: u.id === userId };
    })
  );
  peersWithHours.sort((a, b) => b.thisMonth - a.thisMonth || b.allTime - a.allTime);

  const myRank = peersWithHours.findIndex((p) => p.isYou) + 1;
  const topHours = peersWithHours[0]?.thisMonth ?? 0;
  const gapToFirst = myRank === 1 ? 0 : Math.max(0, Math.round((topHours - thisMonth) * 10) / 10);

  /* ── org overview by department ── */
  const depts = [...new Set(allLearners.map((u) => u.department))].sort();
  const orgOverview = await Promise.all(
    depts.map(async (dept) => {
      const members = allLearners.filter((u) => u.department === dept);
      let total = 0;
      let onTrack = 0;
      for (const u of members) {
        const h = await getMonthHours(db, u.id, THIS_YM);
        total += h;
        if (h >= GOAL_H) onTrack++;
      }
      const avg = members.length > 0 ? Math.round((total / members.length) * 10) / 10 : 0;
      return { dept, totalHours: Math.round(total * 10) / 10, avgHours: avg, onTrack, total: members.length, isYourDept: dept === myDept };
    })
  );

  /* ── weekly trend: hours per dept per week ── */
  const weeklyTrend = await Promise.all(
    WEEKS.map(async (w) => {
      const entry = { week: w.label };
      for (const dept of depts) {
        const members = allLearners.filter((u) => u.department === dept);
        let hrs = 0;
        for (const u of members) {
          const row = (await db.execute({
            sql: `SELECT COALESCE(ROUND(SUM(l.duration_minutes)/60.0,1),0) AS hrs
                  FROM user_lesson_completions ulc
                  JOIN lessons l ON l.id = ulc.lesson_id
                  WHERE ulc.user_id = ? AND date(ulc.completed_at) >= ? AND date(ulc.completed_at) <= ?`,
            args: [u.id, w.start, w.end],
          })).rows[0];
          hrs += Number(row.hrs);
        }
        entry[dept] = Math.round(hrs * 10) / 10;
      }
      return entry;
    })
  );

  /* ── training mode breakdown (by course) ── */
  const modeMap = {};
  const courseRows = (await db.execute({
    sql: `SELECT cm.course_id, COALESCE(ROUND(SUM(l.duration_minutes)/60.0,1),0) AS hrs
          FROM user_lesson_completions ulc
          JOIN lessons l ON l.id = ulc.lesson_id
          JOIN course_modules cm ON cm.id = l.module_id
          WHERE ulc.user_id = ? AND strftime('%Y-%m', ulc.completed_at) = ?
          GROUP BY cm.course_id`,
    args: [userId, THIS_YM],
  })).rows;

  for (const row of courseRows) {
    const cfg  = COURSE_MODE[row.course_id] || { mode: "Video / Self-paced", color: "#10b981" };
    const mode = cfg.mode;
    modeMap[mode] = (modeMap[mode] || 0) + Number(row.hrs);
  }

  const totalModeHrs = Object.values(modeMap).reduce((s, v) => s + v, 0) || 1;
  const modeBreakdown = MODE_ORDER.filter((m) => modeMap[m] > 0).map((m) => ({
    mode: m,
    hours: Math.round(modeMap[m] * 10) / 10,
    pct: Math.round((modeMap[m] / totalModeHrs) * 100),
    color: Object.values(COURSE_MODE).find((c) => c.mode === m)?.color || "#6b7280",
  }));

  /* ── status label ── */
  let statusLabel;
  if (goalPct >= 100) statusLabel = "Goal Reached!";
  else if (goalPct >= 80) statusLabel = "Almost There";
  else if (goalPct >= 50) statusLabel = "On Track";
  else statusLabel = "Behind";

  return ok({
    summary: { thisMonth, lastMonth, allTime, goalPct, goal: GOAL_H, remaining, diff, deptRank: myRank, deptTotal: peersWithHours.length, dept: myDept, gapToFirst, statusLabel },
    weeklyTrend,
    depts,
    modeBreakdown,
    deptPeers: peersWithHours,
    orgOverview,
  });
}
