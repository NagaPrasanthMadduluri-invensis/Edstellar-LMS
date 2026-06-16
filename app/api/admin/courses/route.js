import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const db = await getDb();

  const rows = (await db.execute(`
    SELECT c.*,
      (SELECT COUNT(*) FROM course_modules WHERE course_id = c.id AND is_active = 1) as modules_count,
      (SELECT COUNT(*) FROM lessons l JOIN course_modules cm ON cm.id = l.module_id WHERE cm.course_id = c.id AND l.is_active = 1) as lessons_count,
      (SELECT COUNT(*) FROM assessments WHERE course_id = c.id AND is_active = 1) as assessments_count,
      (SELECT COUNT(*) FROM user_course_assignments WHERE course_id = c.id) as enrollments_count,
      (SELECT COALESCE(SUM(l.duration_minutes), 0) FROM lessons l JOIN course_modules cm ON cm.id = l.module_id WHERE cm.course_id = c.id AND l.is_active = 1 AND cm.is_active = 1) as total_duration_minutes,
      (SELECT MIN(a.passing_score) FROM assessments a WHERE a.course_id = c.id AND a.is_active = 1) as passing_score,
      (SELECT a.title FROM assessments a WHERE a.course_id = c.id AND a.is_active = 1 ORDER BY a.created_at LIMIT 1) as first_assessment_title,
      (SELECT COALESCE(ROUND(AVG(uaa.percentage)), 0) FROM user_assessment_attempts uaa JOIN assessments a ON a.id = uaa.assessment_id WHERE a.course_id = c.id) as avg_score
    FROM courses c ORDER BY c.created_at DESC
  `)).rows;

  const courses = [];
  for (const c of rows) {
    const enrolledCount = Number(c.enrollments_count);
    const lessonsCount  = Number(c.lessons_count);
    let completion_pct  = 0;

    if (enrolledCount > 0 && lessonsCount > 0) {
      const result = (await db.execute({
        sql: `SELECT COUNT(*) as cnt FROM user_course_assignments uca
              WHERE uca.course_id = ?
              AND (
                SELECT COUNT(*) FROM user_lesson_completions ulc
                JOIN lessons l ON l.id = ulc.lesson_id
                JOIN course_modules cm ON cm.id = l.module_id
                WHERE cm.course_id = ? AND ulc.user_id = uca.user_id
                  AND l.is_active = 1 AND cm.is_active = 1
              ) >= ?`,
        args: [c.id, c.id, lessonsCount],
      })).rows[0];
      completion_pct = Math.round((Number(result.cnt) / enrolledCount) * 100);
    }

    courses.push({
      ...c,
      is_active:  c.is_active === 1,
      avg_score:  c.avg_score != null ? Math.round(Number(c.avg_score)) : null,
      completion_pct,
    });
  }

  return ok({ courses });
}

export async function POST(request) {
  const payload = requireAdmin(request);
  if (!payload) return err("Unauthorized", 401);

  const { name, description, thumbnail_url } = await request.json();
  if (!name?.trim()) return err("Course name is required");

  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO courses (name, description, thumbnail_url) VALUES (?, ?, ?)`,
    args: [name.trim(), description || null, thumbnail_url || null],
  });

  const course = (await db.execute({ sql: "SELECT * FROM courses WHERE id = ?", args: [result.lastInsertRowid] })).rows[0];
  return ok({ course }, 201);
}
