import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

const THIS_YM = "2026-06";

async function getLessonCount(db, userId) {
  const r = (await db.execute({ sql: "SELECT COUNT(*) AS c FROM user_lesson_completions WHERE user_id = ?", args: [userId] })).rows[0];
  return Number(r.c);
}
async function getLessonCountMonth(db, userId, ym) {
  const r = (await db.execute({ sql: "SELECT COUNT(*) AS c FROM user_lesson_completions WHERE user_id = ? AND strftime('%Y-%m', completed_at) = ?", args: [userId, ym] })).rows[0];
  return Number(r.c);
}
async function getPassedCount(db, userId) {
  const r = (await db.execute({ sql: "SELECT COUNT(*) AS c FROM user_assessment_attempts WHERE user_id = ? AND is_passed = 1", args: [userId] })).rows[0];
  return Number(r.c);
}
async function getPassedCountMonth(db, userId, ym) {
  const r = (await db.execute({ sql: "SELECT COUNT(*) AS c FROM user_assessment_attempts WHERE user_id = ? AND is_passed = 1 AND strftime('%Y-%m', submitted_at) = ?", args: [userId, ym] })).rows[0];
  return Number(r.c);
}
async function getAvgScore(db, userId) {
  const r = (await db.execute({ sql: "SELECT AVG(percentage) AS avg FROM user_assessment_attempts WHERE user_id = ?", args: [userId] })).rows[0];
  return r.avg !== null ? Math.round(Number(r.avg)) : null;
}
async function getCoursesWithProgressThisMonth(db, userId, ym) {
  const r = (await db.execute({
    sql: `SELECT COUNT(DISTINCT cm.course_id) AS c
          FROM user_lesson_completions ulc
          JOIN lessons l ON l.id = ulc.lesson_id
          JOIN course_modules cm ON cm.id = l.module_id
          WHERE ulc.user_id = ? AND strftime('%Y-%m', ulc.completed_at) = ?`,
    args: [userId, ym],
  })).rows[0];
  return Number(r.c);
}

function initials(firstName, lastName) {
  return `${(firstName || "")[0] || ""}${(lastName || "")[0] || ""}`.toUpperCase();
}

const AVATAR_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1",
];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  if (payload.role !== "learner") return err("Forbidden", 403);

  const db     = await getDb();
  const userId = payload.userId;

  const allLearnerRows = (await db.execute(
    "SELECT id, first_name, last_name, department FROM users WHERE role = 'learner'"
  )).rows;

  /* ── compute stats for every learner ── */
  const learnerStats = await Promise.all(
    allLearnerRows.map(async (u) => {
      const lessons      = await getLessonCount(db, u.id);
      const lessonsMonth = await getLessonCountMonth(db, u.id, THIS_YM);
      const passed       = await getPassedCount(db, u.id);
      const passedMonth  = await getPassedCountMonth(db, u.id, THIS_YM);
      const avgScore     = await getAvgScore(db, u.id);
      const coursesMonth = await getCoursesWithProgressThisMonth(db, u.id, THIS_YM);
      const name         = `${u.first_name} ${u.last_name}`;
      return {
        id:          u.id,
        name,
        initials:    initials(u.first_name, u.last_name),
        dept:        u.department || "Unknown",
        color:       avatarColor(name),
        allTimePoints: lessons * 10 + passed * 50,
        monthPoints:   lessonsMonth * 10 + passedMonth * 50,
        badges:        passed,
        avgScore,
        coursesMonth,
        isYou:       u.id === userId,
      };
    })
  );

  /* ── all-time ranking ── */
  const byAllTime = [...learnerStats].sort((a, b) => b.allTimePoints - a.allTimePoints || b.badges - a.badges);
  byAllTime.forEach((l, i) => { l.allTimeRank = i + 1; });

  /* ── this-month ranking ── */
  const byMonth = [...learnerStats].sort((a, b) => b.monthPoints - a.monthPoints || b.badges - a.badges);
  byMonth.forEach((l, i) => { l.monthRank = i + 1; });

  /* ── podium: top 3 by all-time ── */
  const top3 = byAllTime.slice(0, 3);
  const podium = [
    top3[1] ? { ...top3[1], podiumPos: 2 } : null,
    top3[0] ? { ...top3[0], podiumPos: 1 } : null,
    top3[2] ? { ...top3[2], podiumPos: 3 } : null,
  ].filter(Boolean);

  /* ── recognition ── */
  const learnerOfMonth   = byMonth[0] || null;
  const quickLearner     = [...learnerStats].sort((a, b) => b.coursesMonth - a.coursesMonth || b.lessonsMonth - a.lessonsMonth)[0] || null;
  const assessmentTopper = [...learnerStats].filter((l) => l.avgScore !== null).sort((a, b) => b.avgScore - a.avgScore)[0] || null;

  const recognition = {
    learnerOfMonth:   learnerOfMonth   ? { name: learnerOfMonth.name,   points: learnerOfMonth.monthPoints, badges: learnerOfMonth.badges, isYou: learnerOfMonth.isYou } : null,
    quickLearner:     quickLearner     ? { name: quickLearner.name,     coursesThisMonth: quickLearner.coursesMonth,                       isYou: quickLearner.isYou  } : null,
    assessmentTopper: assessmentTopper ? { name: assessmentTopper.name, avgScore: assessmentTopper.avgScore,                               isYou: assessmentTopper.isYou } : null,
  };

  /* ── me ── */
  const me = learnerStats.find((l) => l.isYou) || null;

  /* ── all learners list (for the table) ── */
  const allLearners = byAllTime.map((l) => ({
    id:            l.id,
    name:          l.name,
    initials:      l.initials,
    dept:          l.dept,
    color:         l.color,
    allTimeRank:   l.allTimeRank,
    monthRank:     l.monthRank,
    allTimePoints: l.allTimePoints,
    monthPoints:   l.monthPoints,
    badges:        l.badges,
    isYou:         l.isYou,
  }));

  const departments = ["All Departments", ...new Set(learnerStats.map((l) => l.dept).filter(Boolean)).values()].sort((a, b) => a === "All Departments" ? -1 : b === "All Departments" ? 1 : a.localeCompare(b));

  return ok({ me, recognition, podium, allLearners, departments });
}
