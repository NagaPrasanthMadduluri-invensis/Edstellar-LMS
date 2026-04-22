import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const db = await getDb();

  const users = (await db.execute(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.department,
           u.is_active, u.created_at,
           COUNT(DISTINCT uca.course_id) AS assigned_courses
    FROM users u
    LEFT JOIN user_course_assignments uca ON uca.user_id = u.id
    WHERE u.role = 'learner'
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `)).rows;

  const employees = [];

  for (const u of users) {
    const totalLessons = ((await db.execute({
      sql: `SELECT COUNT(l.id) AS cnt
      FROM lessons l
      JOIN course_modules cm ON cm.id = l.module_id
      JOIN user_course_assignments uca ON uca.course_id = cm.course_id AND uca.user_id = ?
      WHERE l.is_active = 1 AND cm.is_active = 1`,
      args: [u.id],
    })).rows[0]?.cnt) ?? 0;

    const completedLessons = ((await db.execute({
      sql: `SELECT COUNT(ulc.id) AS cnt
      FROM user_lesson_completions ulc
      JOIN lessons l ON l.id = ulc.lesson_id
      JOIN course_modules cm ON cm.id = l.module_id
      JOIN user_course_assignments uca ON uca.course_id = cm.course_id AND uca.user_id = ?
      WHERE ulc.user_id = ?`,
      args: [u.id, u.id],
    })).rows[0]?.cnt) ?? 0;

    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const best = (await db.execute({
      sql: `SELECT MAX(percentage) AS score, MAX(is_passed) AS passed, COUNT(*) AS attempts FROM user_assessment_attempts WHERE user_id = ?`,
      args: [u.id],
    })).rows[0];

    let status;
    if (best?.passed === 1) status = "completed";
    else if (best?.attempts > 0) status = "failed";
    else if (completedLessons > 0) status = "in-progress";
    else status = "not-started";

    employees.push({
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      department: u.department,
      is_active: u.is_active === 1,
      created_at: u.created_at,
      assigned_courses: u.assigned_courses,
      progress,
      status,
      score: best?.score != null ? Math.round(best.score) : null,
    });
  }

  return ok({ employees });
}
