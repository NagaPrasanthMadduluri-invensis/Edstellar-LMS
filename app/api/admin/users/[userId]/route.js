import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { userId } = await params;
  const db = await getDb();

  const user = (await db.execute({
    sql: `SELECT id, first_name, last_name, email, department, is_active, created_at FROM users WHERE id = ? AND role = 'learner'`,
    args: [userId],
  })).rows[0];
  if (!user) return err("User not found", 404);

  const assignments = (await db.execute({
    sql: `SELECT uca.course_id, uca.assigned_at, c.name AS course_name, c.description
    FROM user_course_assignments uca
    JOIN courses c ON c.id = uca.course_id AND c.is_active = 1
    WHERE uca.user_id = ?
    ORDER BY uca.assigned_at DESC`,
    args: [userId],
  })).rows;

  const courses = [];

  for (const assignment of assignments) {
    const courseId = assignment.course_id;

    const modules = (await db.execute({
      sql: `SELECT id, title FROM course_modules WHERE course_id = ? AND is_active = 1 ORDER BY sort_order, created_at`,
      args: [courseId],
    })).rows;

    let totalLessons = 0;
    let completedLessons = 0;

    for (const m of modules) {
      const lessons = (await db.execute({
        sql: `SELECT l.id,
          CASE WHEN ulc.id IS NOT NULL THEN 1 ELSE 0 END AS done
        FROM lessons l
        LEFT JOIN user_lesson_completions ulc ON ulc.lesson_id = l.id AND ulc.user_id = ?
        WHERE l.module_id = ? AND l.is_active = 1`,
        args: [userId, m.id],
      })).rows;
      totalLessons += lessons.length;
      completedLessons += lessons.filter((l) => l.done).length;
    }

    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const assessments = (await db.execute({
      sql: `SELECT a.id, a.title, a.passing_score,
        (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.id) AS questions_count,
        (SELECT COUNT(*) FROM user_assessment_attempts WHERE assessment_id = a.id AND user_id = ?) AS attempt_count,
        (SELECT MAX(percentage) FROM user_assessment_attempts WHERE assessment_id = a.id AND user_id = ?) AS best_score
      FROM assessments a WHERE a.course_id = ? AND a.is_active = 1
      ORDER BY a.created_at`,
      args: [userId, userId, courseId],
    })).rows;

    for (const a of assessments) {
      const attempts = (await db.execute({
        sql: `SELECT id, score, total_questions, percentage, is_passed, submitted_at
        FROM user_assessment_attempts
        WHERE assessment_id = ? AND user_id = ?
        ORDER BY submitted_at DESC`,
        args: [a.id, userId],
      })).rows;
      a.has_passed = attempts.some((att) => att.is_passed);
      a.attempts = attempts;
    }

    courses.push({
      course_id: courseId,
      course_name: assignment.course_name,
      assigned_at: assignment.assigned_at,
      totalLessons,
      completedLessons,
      progress,
      assessments,
    });
  }

  const allAttempts = courses.flatMap((c) => c.assessments.flatMap((a) => a.attempts));
  const passedAssessments = courses.flatMap((c) => c.assessments).filter((a) => a.has_passed).length;
  const bestScore = allAttempts.length > 0 ? Math.max(...allAttempts.map((a) => a.percentage)) : null;

  return ok({
    user: { ...user, is_active: user.is_active === 1 },
    summary: {
      coursesAssigned: courses.length,
      coursesCompleted: courses.filter((c) => c.progress === 100).length,
      totalAttempts: allAttempts.length,
      passedAssessments,
      bestScore,
    },
    courses,
  });
}
