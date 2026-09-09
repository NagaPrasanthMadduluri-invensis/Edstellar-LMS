import { apiClient } from "@/lib/api-client";
/**
 * Auth now lives in the NestJS server. These calls go to NEXT_PUBLIC_SERVER_URL
 * and rely on the browser to carry the HttpOnly `lms_token` cookie, which is why
 * the server is the default target for apiClient.
 *
 * There are deliberately no cookie helpers left in this file. The token is
 * HttpOnly — client JavaScript cannot read or write it, and that is the point.
 * Server Components read the session via `lib/session.js` instead.
 */
export async function loginUser({ email, password }) {
  return apiClient("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}
export async function registerUser({ firstName, lastName, email, password, department }) {
  return apiClient("/api/auth/register", {
    method: "POST",
    body: {
      first_name: firstName,
      last_name: lastName,
      email,
      password,
      department,
    },
  });
}
export async function logoutUser() {
  return apiClient("/api/auth/logout", { method: "POST" });
}
export async function getCurrentUser() {
  return apiClient("/api/auth/me");
}
/**
 * Maps the API user onto the shape the UI renders. Kept identical to the old
 * helper except that `role` is now the plain string the JWT carries
 * ("admin" | "learner") rather than a nested { name, slug } object — one role
 * vocabulary across the whole system instead of two.
 */
export function normalizeUser(apiUser) {
  if (!apiUser) return null;
  const firstName = apiUser.first_name || "";
  const lastName = apiUser.last_name || "";
  return {
    id: apiUser.id,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    email: apiUser.email,
    role: apiUser.role || "learner",
    // Three portals since `specs/rbac.md` decision 6. Kept in step with
    // `lib/session.js`, which computes the same label for the server-rendered
    // shell — if these two disagree the header and the sidebar disagree.
    roleLabel:
      apiUser.role === "admin"
        ? "LMS Admin"
        : apiUser.role === "trainer"
          ? "Trainer"
          : "Learner",
    initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
    isActive: apiUser.is_active,
    isPlatformAdmin: apiUser.is_platform_admin === true,
    /** What this role may do. Cosmetic gating only — the API enforces. */
    permissions: Array.isArray(apiUser.permissions) ? apiUser.permissions : [],
  };
}
