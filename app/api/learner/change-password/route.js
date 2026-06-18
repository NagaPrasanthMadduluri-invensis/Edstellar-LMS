import { getDb } from "@/lib/db/index.js";
import { requireAuth, verifyPassword, hashPassword, ok, err } from "@/lib/auth.js";

const RULES = {
  minLength:   (p) => p.length >= 8,
  uppercase:   (p) => /[A-Z]/.test(p),
  number:      (p) => /[0-9]/.test(p),
  special:     (p) => /[^A-Za-z0-9]/.test(p),
};

export async function POST(request) {
  const payload = requireAuth(request);
  if (!payload) return err("Unauthorized", 401);

  let body;
  try { body = await request.json(); } catch { return err("Invalid request body", 400); }

  const { currentPassword, newPassword } = body;

  if (!currentPassword) return err("Current password is required", 422);
  if (!newPassword)      return err("New password is required", 422);

  // Enforce strength rules server-side
  const failed = Object.entries(RULES).filter(([, check]) => !check(newPassword));
  if (failed.length) {
    return err(
      "New password does not meet strength requirements",
      422,
      {
        minLength: !RULES.minLength(newPassword) ? "Must be at least 8 characters" : null,
        uppercase: !RULES.uppercase(newPassword) ? "Must contain at least one uppercase letter" : null,
        number:    !RULES.number(newPassword)    ? "Must contain at least one number" : null,
        special:   !RULES.special(newPassword)   ? "Must contain at least one special character" : null,
      }
    );
  }

  const db = await getDb();
  const user = (await db.execute({
    sql: "SELECT id, password FROM users WHERE id = ? AND is_active = 1",
    args: [payload.userId],
  })).rows[0];

  if (!user) return err("User not found", 404);

  if (!verifyPassword(currentPassword, user.password)) {
    return err("Current password is incorrect", 401);
  }

  if (currentPassword === newPassword) {
    return err("New password must be different from your current password", 422);
  }

  const hashed = hashPassword(newPassword);
  await db.execute({
    sql: "UPDATE users SET password = ? WHERE id = ?",
    args: [hashed, payload.userId],
  });

  return ok({ message: "Password updated successfully" });
}
