import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

export async function DELETE(request, { params }) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);
  const { assignmentId } = await params;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM user_course_assignments WHERE id = ?", args: [assignmentId] });
  return ok({ message: "Assignment removed" });
}
