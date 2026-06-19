import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

export async function GET(request, { params }) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  const { packageId } = await params;

  const db = await getDb();

  // Verify learner is assigned (direct or via course enrollment)
  const hasAccess = (await db.execute({
    sql: `SELECT 1 FROM user_scorm_assignments WHERE user_id = ? AND package_id = ?
          UNION
          SELECT 1 FROM lessons l
          JOIN course_modules cm ON cm.id = l.module_id
          JOIN user_course_assignments uca ON uca.course_id = cm.course_id
          WHERE l.scorm_package_id = ? AND uca.user_id = ?
          LIMIT 1`,
    args: [payload.userId, packageId, packageId, payload.userId],
  })).rows[0];
  if (!hasAccess) return err("Not enrolled in this package", 403);

  const tracking = (await db.execute({
    sql: "SELECT * FROM scorm_tracking WHERE user_id = ? AND package_id = ?",
    args: [payload.userId, packageId],
  })).rows[0] ?? null;

  return ok({ tracking });
}

export async function POST(request, { params }) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);
  const { packageId } = await params;

  let body;
  try { body = await request.json(); } catch { return err("Invalid body", 400); }

  const { cmi_data } = body;
  if (!cmi_data) return err("cmi_data required", 422);

  const db = await getDb();

  // Verify assignment (direct or via course enrollment)
  const hasAccess = (await db.execute({
    sql: `SELECT 1 FROM user_scorm_assignments WHERE user_id = ? AND package_id = ?
          UNION
          SELECT 1 FROM lessons l
          JOIN course_modules cm ON cm.id = l.module_id
          JOIN user_course_assignments uca ON uca.course_id = cm.course_id
          WHERE l.scorm_package_id = ? AND uca.user_id = ?
          LIMIT 1`,
    args: [payload.userId, packageId, packageId, payload.userId],
  })).rows[0];
  if (!hasAccess) return err("Not enrolled in this package", 403);

  // Extract key fields from CMI data (handles both SCORM 1.2 and 2004)
  const cmi = typeof cmi_data === "string" ? JSON.parse(cmi_data) : cmi_data;

  // SCORM 1.2 fields live under cmi.core; SCORM 2004 at cmi root
  const lessonStatus =
    cmi?.core?.lesson_status ?? cmi?.lesson_status ?? "not attempted";
  const completionStatus =
    cmi?.completion_status ?? (lessonStatus === "completed" || lessonStatus === "passed" ? "completed" : "incomplete");
  const successStatus =
    cmi?.success_status ?? (lessonStatus === "passed" ? "passed" : lessonStatus === "failed" ? "failed" : "unknown");
  const scoreRaw = cmi?.core?.score?.raw ?? cmi?.score?.raw ?? null;
  const scoreMax = cmi?.core?.score?.max ?? cmi?.score?.max ?? null;
  const totalTime = cmi?.core?.total_time ?? cmi?.total_time ?? null;
  const suspendData = cmi?.suspend_data ?? null;
  const location = cmi?.core?.lesson_location ?? cmi?.location ?? null;

  await db.execute({
    sql: `INSERT INTO scorm_tracking
            (user_id, package_id, lesson_status, completion_status, success_status,
             score_raw, score_max, total_time, suspend_data, location, cmi_data, updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
          ON CONFLICT(user_id, package_id) DO UPDATE SET
            lesson_status     = excluded.lesson_status,
            completion_status = excluded.completion_status,
            success_status    = excluded.success_status,
            score_raw         = excluded.score_raw,
            score_max         = excluded.score_max,
            total_time        = excluded.total_time,
            suspend_data      = excluded.suspend_data,
            location          = excluded.location,
            cmi_data          = excluded.cmi_data,
            updated_at        = excluded.updated_at`,
    args: [
      payload.userId, packageId, lessonStatus, completionStatus, successStatus,
      scoreRaw !== null ? Number(scoreRaw) : null,
      scoreMax !== null ? Number(scoreMax) : null,
      totalTime, suspendData, location,
      JSON.stringify(cmi),
    ],
  });

  // Auto-mark the linked lesson complete if SCORM reports done
  const isDone = completionStatus === "completed" || lessonStatus === "passed" || lessonStatus === "completed";
  if (isDone) {
    const linkedLesson = (await db.execute({
      sql: `SELECT l.id FROM lessons l
            JOIN course_modules cm ON cm.id = l.module_id
            JOIN user_course_assignments uca ON uca.course_id = cm.course_id
            WHERE l.scorm_package_id = ? AND uca.user_id = ?
            LIMIT 1`,
      args: [packageId, payload.userId],
    })).rows[0];

    if (linkedLesson) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO user_lesson_completions (user_id, lesson_id) VALUES (?, ?)`,
        args: [payload.userId, linkedLesson.id],
      });
    }
  }

  return ok({ message: "Tracking saved" });
}
