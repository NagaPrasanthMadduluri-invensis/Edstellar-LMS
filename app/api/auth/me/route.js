import { getDb } from "@/lib/db/index.js";
import { requireAuth, ok, err } from "@/lib/auth.js";

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ? AND is_active = 1").get(payload.userId);
  if (!user) return err("User not found", 404);

  return ok({
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: {
        name: user.role === "admin" ? "LMS Admin" : "Learner",
        slug: user.role === "admin" ? "lms_admin" : "customer",
      },
      is_active: user.is_active === 1,
    },
  });
}
