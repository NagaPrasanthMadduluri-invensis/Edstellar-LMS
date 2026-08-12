import { cookies } from "next/headers";

const TOKEN_COOKIE = "lms_token";
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "";

/**
 * Resolves the signed-in user for a Server Component by asking the API.
 *
 * The frontend deliberately holds NO signing secret and does not verify the
 * JWT itself. That was the last piece of backend knowledge living in the
 * client; the server is the single authority on identity, which is what lets
 * this project ship as a standalone frontend repository.
 *
 * Returns null when there is no cookie, the token is invalid/expired, or the
 * account was deactivated — the caller redirects to /login.
 */
export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${SERVER_URL}/api/auth/me`, {
      headers: { Cookie: `${TOKEN_COOKIE}=${token}` },
      // Identity must never be served from a cache — a stale hit would render
      // the shell for the wrong user after a logout or role change.
      cache: "no-store",
    });
    if (!res.ok) return null;

    const { user } = await res.json();
    if (!user) return null;

    const firstName = user.first_name || "";
    const lastName = user.last_name || "";

    return {
      id: user.id,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      email: user.email,
      role: user.role,
      roleLabel: user.role === "admin" ? "LMS Admin" : "Learner",
      initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
      isActive: user.is_active,
    };
  } catch {
    // API unreachable — treat as signed out rather than crashing the render.
    return null;
  }
}
