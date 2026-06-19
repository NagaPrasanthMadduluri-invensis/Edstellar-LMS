import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { courseId } = await params;
  const db = await getDb();

  const assignments = (await db.execute({
    sql: `SELECT uca.*, u.first_name, u.last_name, u.email,
      (SELECT COUNT(*) FROM user_lesson_completions ulc
       JOIN lessons l ON l.id = ulc.lesson_id
       JOIN course_modules cm ON cm.id = l.module_id
       WHERE cm.course_id = ? AND ulc.user_id = uca.user_id) as completed_lessons,
      (SELECT COUNT(*) FROM lessons l
       JOIN course_modules cm ON cm.id = l.module_id
       WHERE cm.course_id = ? AND l.is_active = 1 AND cm.is_active = 1) as total_lessons
    FROM user_course_assignments uca
    JOIN users u ON u.id = uca.user_id
    WHERE uca.course_id = ?
    ORDER BY uca.assigned_at DESC`,
    args: [courseId, courseId, courseId],
  })).rows;

  // Fetch SCORM results for all learners in this course
  const scormRows = (await db.execute({
    sql: `SELECT st.user_id, st.package_id, sp.title as package_title,
                 st.lesson_status, st.completion_status, st.success_status,
                 st.score_raw, st.score_max, st.total_time
          FROM scorm_tracking st
          JOIN scorm_packages sp ON sp.id = st.package_id
          JOIN lessons l ON l.scorm_package_id = st.package_id
          JOIN course_modules cm ON cm.id = l.module_id
          WHERE cm.course_id = ?`,
    args: [courseId],
  })).rows;

  // Group SCORM results by user_id
  const scormByUser = {};
  for (const row of scormRows) {
    if (!scormByUser[row.user_id]) scormByUser[row.user_id] = [];
    scormByUser[row.user_id].push(row);
  }

  const enriched = assignments.map((a) => ({
    ...a,
    scorm_results: scormByUser[a.user_id] || [],
  }));

  return ok({ assignments: enriched });
}

export async function POST(request, { params }) {
  const adminPayload = requireAdmin(request);
  if (!adminPayload) return err("Unauthorized", 401);
  const { courseId } = await params;
  const { user_id, due_date } = await request.json();
  if (!user_id) return err("user_id is required");

  const db = await getDb();

  const user = (await db.execute({ sql: "SELECT id FROM users WHERE id = ? AND role = 'learner'", args: [user_id] })).rows[0];
  if (!user) return err("Learner not found", 404);

  try {
    await db.execute({
      sql: `INSERT INTO user_course_assignments (user_id, course_id, assigned_by, due_date) VALUES (?,?,?,?)`,
      args: [user_id, courseId, adminPayload.userId, due_date || null],
    });
  } catch {
    /* already assigned — update due_date if provided */
    if (due_date) {
      await db.execute({
        sql: `UPDATE user_course_assignments SET due_date = ? WHERE user_id = ? AND course_id = ?`,
        args: [due_date, user_id, courseId],
      });
    }
    return ok({ message: "Assignment updated" });
  }

  return ok({ message: "User assigned successfully" }, 201);
}
