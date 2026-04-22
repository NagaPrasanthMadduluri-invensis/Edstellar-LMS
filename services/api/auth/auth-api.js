import { apiClient } from "@/lib/api-client";

const TOKEN_COOKIE = "lms_token";
const USER_COOKIE = "lms_user";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/* ──────────────────────────────────────
   API CALLS
   ────────────────────────────────────── */

export async function loginUser({ email, password }) {
  return apiClient("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function registerUser({ firstName, lastName, email, password, department }) {
  return apiClient("/api/auth/register", {
    method: "POST",
    body: { first_name: firstName, last_name: lastName, email, password, department },
  });
}

export async function logoutUser(token) {
  // No server-side session invalidation needed — just clear cookies
}

export async function getCurrentUser(token) {
  return apiClient("/api/auth/me", { token });
}

/* ──────────────────────────────────────
   COOKIE HELPERS — CLIENT SIDE
   ────────────────────────────────────── */

function normalizeUser(apiUser) {
  if (!apiUser) throw new Error("Login failed: no user data returned");
  const firstName = apiUser.first_name || "";
  const lastName = apiUser.last_name || "";
  const name = `${firstName} ${lastName}`.trim();
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return {
    id: apiUser.id,
    firstName,
    lastName,
    name,
    email: apiUser.email,
    role: apiUser.role || { name: "Learner", slug: "customer" },
    initials,
    isActive: apiUser.is_active,
  };
}

export function setAuthCookies({ token, user }) {
  const normalizedUser = normalizeUser(user);
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  document.cookie = `${USER_COOKIE}=${encodeURIComponent(JSON.stringify(normalizedUser))}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  return normalizedUser;
}

export function getTokenFromCookie() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${TOKEN_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.split("=").slice(1).join("="));
}

export function getUserFromCookie() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${USER_COOKIE}=`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.split("=").slice(1).join("=")));
  } catch {
    return null;
  }
}

export function clearAuthCookies() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${USER_COOKIE}=; path=/; max-age=0`;
}

/* ──────────────────────────────────────
   COOKIE HELPERS — SERVER SIDE
   ────────────────────────────────────── */

export function getTokenFromCookieServer(cookieStore) {
  const cookie = cookieStore.get(TOKEN_COOKIE);
  return cookie?.value ? decodeURIComponent(cookie.value) : null;
}

export function getUserFromCookieServer(cookieStore) {
  const cookie = cookieStore.get(USER_COOKIE);
  if (!cookie?.value) return null;
  try {
    return JSON.parse(decodeURIComponent(cookie.value));
  } catch {
    return null;
  }
}

export { TOKEN_COOKIE, USER_COOKIE, normalizeUser };
