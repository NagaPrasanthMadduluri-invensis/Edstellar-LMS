import { getDb } from "@/lib/db/index.js";
import { verifyPassword, signToken, ok, err } from "@/lib/auth.js";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return err("Email and password are required");

    const db = await getDb();
    const user = (await db.execute({ sql: "SELECT * FROM users WHERE email = ? AND is_active = 1", args: [email.toLowerCase().trim()] })).rows[0];
    if (!user) return err("Invalid email or password", 401);

    const valid = verifyPassword(password, user.password);
    if (!valid) return err("Invalid email or password", 401);

    const token = signToken({ userId: user.id, role: user.role, email: user.email });

    return ok({
      token,
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
  } catch (e) {
    console.error("[auth/login]", e);
    return err("Internal server error", 500);
  }
}
