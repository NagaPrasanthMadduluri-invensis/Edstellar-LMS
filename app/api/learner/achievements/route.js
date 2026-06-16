import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

const DUE_DAYS = 44;

function addDays(iso, days) {
  const d = new Date(iso.replace(" ", "T"));
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso.replace ? iso.replace(" ", "T") : iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/* ── Badge definitions ── */
const BADGE_DEFS = [
  { id: "first_steps",       tier: "BRONZE",   title: "First Steps",       desc: "Completed your first course",               icon: "target",   check: (s) => s.completedCourses >= 1    },
  { id: "quick_learner",     tier: null,        title: "Quick Learner",     desc: "Completed a course before its due date",    icon: "zap",      check: (s) => s.completedBeforeDue >= 1  },
  { id: "assessment_topper", tier: "GOLD",      title: "Assessment Topper", desc: "Scored 90% or higher on an assessment",     icon: "trophy",   check: (s) => s.hasScore90Plus           },
  { id: "perfectionist",     tier: "PLATINUM",  title: "Perfectionist",     desc: "Achieved a perfect 100% on an assessment", icon: "perfect",  check: (s) => s.hasScore100              },
  { id: "committed_learner", tier: "SILVER",    title: "Committed Learner", desc: "Completed 3 or more courses",              icon: "books",    check: (s) => s.completedCourses >= 3    },
  { id: "scholar",           tier: "GOLD",      title: "Scholar",           desc: "Completed 5 or more courses",              icon: "scholar",  check: (s) => s.completedCourses >= 5    },
  { id: "feedback_hero",     tier: null,        title: "Feedback Hero",     desc: "Submitted feedback on 3 or more courses",  icon: "feedback", check: (s) => s.feedbackCount >= 3       },
  { id: "high_flyer",        tier: "SILVER",    title: "High Flyer",        desc: "Earned 500 or more points",                icon: "rocket",   check: (s) => s.points >= 500            },
  { id: "learning_champion", tier: "GOLD",      title: "Learning Champion", desc: "Earned 1000 or more points",               icon: "crown",    check: (s) => s.points >= 1000           },
];

/* Progress hint for next-badge card */
function nextBadgeHint(badgeDef, stats) {
  switch (badgeDef.id) {
    case "first_steps":       return `Complete ${1 - stats.completedCourses} more course`;
    case "quick_learner":     return "Finish a course before its due date";
    case "assessment_topper": return "Score 90% or higher on any assessment";
    case "perfectionist":     return "Score 100% on any assessment";
    case "committed_learner": return `Complete ${3 - stats.completedCourses} more course${3 - stats.completedCourses !== 1 ? "s" : ""}`;
    case "scholar":           return `Complete ${5 - stats.completedCourses} more course${5 - stats.completedCourses !== 1 ? "s" : ""}`;
    case "feedback_hero":     return `Submit feedback on ${3 - stats.feedbackCount} more course${3 - stats.feedbackCount !== 1 ? "s" : ""}`;
    case "high_flyer":        return `Earn ${500 - stats.points} more points`;
    case "learning_champion": return `Earn ${1000 - stats.points} more points`;
    default:                  return badgeDef.desc;
  }
}

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  if (payload.role !== "learner") return err("Forbidden", 403);

  const db     = await getDb();
  const userId = payload.userId;

  /* ── raw counts ── */
  const totalLessons  = Number((await db.execute({ sql: "SELECT COUNT(*) AS c FROM user_lesson_completions WHERE user_id = ?", args: [userId] })).rows[0].c);
  const passedAssmnts = Number((await db.execute({ sql: "SELECT COUNT(*) AS c FROM user_assessment_attempts WHERE user_id = ? AND is_passed = 1", args: [userId] })).rows[0].c);
  const points        = totalLessons * 10 + passedAssmnts * 50;

  /* ── courses ── */
  const assignments = (await db.execute({
    sql: `SELECT uca.course_id, uca.assigned_at,
            (SELECT COUNT(*) FROM lessons l JOIN course_modules cm ON cm.id = l.module_id
             WHERE cm.course_id = uca.course_id AND l.is_active=1 AND cm.is_active=1) AS total,
            (SELECT COUNT(*) FROM user_lesson_completions ulc2
             JOIN lessons l ON l.id = ulc2.lesson_id
             JOIN course_modules cm ON cm.id = l.module_id
             WHERE cm.course_id = uca.course_id AND ulc2.user_id = ?) AS done
          FROM user_course_assignments uca WHERE uca.user_id = ?`,
    args: [userId, userId],
  })).rows;

  let completedCourses  = 0;
  let completedBeforeDue = 0;

  for (const row of assignments) {
    const total = Number(row.total);
    const done  = Number(row.done);
    if (total > 0 && done >= total) {
      completedCourses++;
      /* check if last completion is before due date */
      const due = addDays(row.assigned_at, DUE_DAYS);
      const lastCompRow = (await db.execute({
        sql: `SELECT MAX(ulc.completed_at) AS last_at FROM user_lesson_completions ulc
              JOIN lessons l ON l.id = ulc.lesson_id JOIN course_modules cm ON cm.id = l.module_id
              WHERE cm.course_id = ? AND ulc.user_id = ?`,
        args: [row.course_id, userId],
      })).rows[0];
      if (lastCompRow.last_at && lastCompRow.last_at.slice(0, 10) <= due) completedBeforeDue++;
    }
  }

  /* ── assessment scores ── */
  const scoreRows = (await db.execute({
    sql: "SELECT percentage FROM user_assessment_attempts WHERE user_id = ?",
    args: [userId],
  })).rows;
  const hasScore90Plus = scoreRows.some((r) => Number(r.percentage) >= 90);
  const hasScore100    = scoreRows.some((r) => Number(r.percentage) === 100);

  const stats = { points, completedCourses, completedBeforeDue, hasScore90Plus, hasScore100, feedbackCount: 0 };

  /* ── rank ── */
  const allLearners = (await db.execute("SELECT id FROM users WHERE role='learner'")).rows;
  let rank = 1;
  for (const u of allLearners) {
    if (u.id === userId) continue;
    const uL = Number((await db.execute({ sql: "SELECT COUNT(*) AS c FROM user_lesson_completions WHERE user_id = ?", args: [u.id] })).rows[0].c);
    const uP = Number((await db.execute({ sql: "SELECT COUNT(*) AS c FROM user_assessment_attempts WHERE user_id = ? AND is_passed=1", args: [u.id] })).rows[0].c);
    if (uL * 10 + uP * 50 > points) rank++;
  }

  /* ── badges ── */
  const badges = BADGE_DEFS.map((b) => ({ ...b, earned: b.check(stats) }));
  const earnedCount = badges.filter((b) => b.earned).length;

  /* ── next badge ── */
  const nextBadge = badges.find((b) => !b.earned) || null;
  const nextBadgeInfo = nextBadge ? { ...nextBadge, hint: nextBadgeHint(nextBadge, stats) } : null;

  /* ── points history: lesson completions + assessment passes ── */
  const lessonEvents = (await db.execute({
    sql: `SELECT ulc.completed_at AS event_time, l.title, c.name AS course_name, 10 AS pts, 'lesson' AS type
          FROM user_lesson_completions ulc
          JOIN lessons l ON l.id = ulc.lesson_id
          JOIN course_modules cm ON cm.id = l.module_id
          JOIN courses c ON c.id = cm.course_id
          WHERE ulc.user_id = ?
          ORDER BY ulc.completed_at DESC LIMIT 10`,
    args: [userId],
  })).rows;

  const assessmentEvents = (await db.execute({
    sql: `SELECT uaa.submitted_at AS event_time, a.title, c.name AS course_name,
                 50 AS pts, 'assessment' AS type
          FROM user_assessment_attempts uaa
          JOIN assessments a ON a.id = uaa.assessment_id
          JOIN courses c ON c.id = a.course_id
          WHERE uaa.user_id = ? AND uaa.is_passed = 1
          ORDER BY uaa.submitted_at DESC`,
    args: [userId],
  })).rows;

  const pointsHistory = [
    ...lessonEvents.map((e) => ({
      activity: "Lesson Completed",
      detail:   e.title,
      course:   e.course_name,
      date:     fmtDate(e.event_time),
      points:   Number(e.pts),
      type:     "lesson",
    })),
    ...assessmentEvents.map((e) => ({
      activity: "Assessment Passed",
      detail:   e.title,
      course:   e.course_name,
      date:     fmtDate(e.event_time),
      points:   Number(e.pts),
      type:     "assessment",
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20);

  return ok({ summary: { points, rank, rankOf: allLearners.length, earnedCount }, badges, nextBadge: nextBadgeInfo, pointsHistory });
}
