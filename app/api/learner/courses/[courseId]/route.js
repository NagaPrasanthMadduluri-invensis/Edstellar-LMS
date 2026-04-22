import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  if (payload.role !== "learner") return err("Forbidden", 403);

  const { courseId } = await params;
  const userId = payload.userId;
  const db = getDb();

  // Verify assignment
  const assignment = db.prepare(`
    SELECT * FROM user_course_assignments WHERE user_id = ? AND course_id = ?
  `).get(userId, courseId);
  if (!assignment) return err("You are not enrolled in this course", 403);

  const course = db.prepare("SELECT * FROM courses WHERE id = ? AND is_active = 1").get(courseId);
  if (!course) return err("Course not found", 404);

  const modules = db.prepare(`
    SELECT * FROM course_modules WHERE course_id = ? AND is_active = 1 ORDER BY sort_order, created_at
  `).all(courseId);

  let totalLessons = 0;
  let completedLessons = 0;
  let prevModuleComplete = true; // first module is always accessible

  for (const m of modules) {
    const lessons = db.prepare(`
      SELECT l.*,
        CASE WHEN ulc.id IS NOT NULL THEN 'completed' ELSE 'not_started' END as progress_status
      FROM lessons l
      LEFT JOIN user_lesson_completions ulc ON ulc.lesson_id = l.id AND ulc.user_id = ?
      WHERE l.module_id = ? AND l.is_active = 1 ORDER BY l.sort_order, l.created_at
    `).all(userId, m.id);

    const moduleIsLocked = !prevModuleComplete;
    for (let i = 0; i < lessons.length; i++) {
      if (moduleIsLocked) {
        lessons[i].is_locked = true;
      } else if (i === 0) {
        lessons[i].is_locked = false;
      } else {
        lessons[i].is_locked = lessons[i - 1].progress_status !== "completed";
      }
    }

    m.lessons = lessons;
    m.total_count = lessons.length;
    m.completed_count = lessons.filter((l) => l.progress_status === "completed").length;
    totalLessons += lessons.length;
    completedLessons += m.completed_count;

    prevModuleComplete = !moduleIsLocked && m.completed_count === m.total_count;
  }

  const progress_percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const assessmentsUnlocked = totalLessons > 0 && completedLessons === totalLessons;

  // Assessments for this course
  const assessments = db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.id) as questions_count,
      (SELECT COUNT(*) FROM user_assessment_attempts WHERE assessment_id = a.id AND user_id = ?) as attempt_count,
      (SELECT MAX(percentage) FROM user_assessment_attempts WHERE assessment_id = a.id AND user_id = ?) as best_score
    FROM assessments a WHERE a.course_id = ? AND a.is_active = 1 ORDER BY a.created_at
  `).all(userId, userId, courseId);

  for (const a of assessments) {
    a.last_attempt = db.prepare(`
      SELECT percentage, is_passed, submitted_at FROM user_assessment_attempts
      WHERE assessment_id = ? AND user_id = ? ORDER BY submitted_at DESC LIMIT 1
    `).get(a.id, userId) || null;
  }

  return ok({
    course: { ...course, modules_count: modules.length, lessons_count: totalLessons },
    enrollment: { status: progress_percentage === 100 ? "completed" : "active", progress_percentage, granted_at: assignment.assigned_at },
    modules,
    assessments,
    assessmentsUnlocked,
  });
}
