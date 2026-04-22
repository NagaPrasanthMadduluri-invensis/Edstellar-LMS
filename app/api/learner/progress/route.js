import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  if (payload.role !== "learner") return err("Forbidden", 403);

  const userId = payload.userId;
  const db = getDb();

  const assignments = db.prepare(`
    SELECT uca.course_id, uca.assigned_at, c.name, c.description
    FROM user_course_assignments uca
    JOIN courses c ON c.id = uca.course_id AND c.is_active = 1
    WHERE uca.user_id = ?
    ORDER BY uca.assigned_at DESC
  `).all(userId);

  const courses = [];

  for (const assignment of assignments) {
    const courseId = assignment.course_id;

    const modules = db.prepare(
      `SELECT id, title FROM course_modules WHERE course_id = ? AND is_active = 1 ORDER BY sort_order, created_at`
    ).all(courseId);

    let totalLessons = 0;
    let completedLessons = 0;
    let firstCompletionDate = null;

    for (const m of modules) {
      const lessons = db.prepare(`
        SELECT l.id, ulc.completed_at
        FROM lessons l
        LEFT JOIN user_lesson_completions ulc ON ulc.lesson_id = l.id AND ulc.user_id = ?
        WHERE l.module_id = ? AND l.is_active = 1
      `).all(userId, m.id);

      totalLessons += lessons.length;
      for (const l of lessons) {
        if (l.completed_at) {
          completedLessons += 1;
          if (!firstCompletionDate || l.completed_at < firstCompletionDate) {
            firstCompletionDate = l.completed_at;
          }
        }
      }
    }

    const progress_percentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const assessments = db.prepare(`
      SELECT a.id, a.title, a.passing_score,
        (SELECT COUNT(*) FROM user_assessment_attempts WHERE assessment_id = a.id AND user_id = ?) as attempt_count,
        (SELECT MAX(percentage) FROM user_assessment_attempts WHERE assessment_id = a.id AND user_id = ?) as best_score,
        (SELECT is_passed FROM user_assessment_attempts WHERE assessment_id = a.id AND user_id = ? ORDER BY submitted_at DESC LIMIT 1) as is_passed,
        (SELECT MIN(submitted_at) FROM user_assessment_attempts WHERE assessment_id = a.id AND user_id = ?) as first_attempt_date
      FROM assessments a WHERE a.course_id = ? AND a.is_active = 1
    `).all(userId, userId, userId, userId, courseId);

    const firstAttemptDate = assessments.reduce((min, a) => {
      if (!a.first_attempt_date) return min;
      return !min || a.first_attempt_date < min ? a.first_attempt_date : min;
    }, null);

    const hasPassed = assessments.some((a) => a.is_passed);

    courses.push({
      course: { id: courseId, name: assignment.name, description: assignment.description },
      enrollment: { assigned_at: assignment.assigned_at, progress_percentage },
      totalLessons,
      completedLessons,
      firstCompletionDate,
      firstAttemptDate,
      hasPassed,
      modules,
      assessments,
    });
  }

  return ok({ courses });
}
