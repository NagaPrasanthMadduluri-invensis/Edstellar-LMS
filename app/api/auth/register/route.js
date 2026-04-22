import { getDb } from "@/lib/db/index.js";
import { hashPassword, signToken, ok, err } from "@/lib/auth.js";

const VALID_DEPARTMENTS = [
  "Sales", "HR", "Technology", "Finance", "Marketing",
  "Operations", "Legal", "Customer Support", "Product", "Design",
];

export async function POST(request) {
  try {
    const { first_name, last_name, email, password, department } = await request.json();

    if (!first_name?.trim()) return err("First name is required", 422, { first_name: ["First name is required"] });
    if (!last_name?.trim()) return err("Last name is required", 422, { last_name: ["Last name is required"] });
    if (!email?.trim()) return err("Email is required", 422, { email: ["Email is required"] });
    if (!password || password.length < 8) return err("Password must be at least 8 characters", 422, { password: ["Password must be at least 8 characters"] });
    if (!department || !VALID_DEPARTMENTS.includes(department)) return err("Please select a valid department", 422, { department: ["Please select a department"] });

    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase().trim());
    if (existing) return err("An account with this email already exists", 422, { email: ["Email already in use"] });

    const hashed = hashPassword(password);
    const result = db.prepare(`
      INSERT INTO users (first_name, last_name, email, password, role, department)
      VALUES (?, ?, ?, ?, 'learner', ?)
    `).run(first_name.trim(), last_name.trim(), email.toLowerCase().trim(), hashed, department);

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    const token = signToken({ userId: user.id, role: user.role, email: user.email });

    return ok({
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        department: user.department,
        role: { name: "Learner", slug: "customer" },
        is_active: true,
      },
    }, 201);
  } catch (e) {
    console.error("[auth/register]", e);
    return err("Internal server error", 500);
  }
}
