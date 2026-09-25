import { apiClient } from "@/lib/api-client";

/**
 * "My account" — the caller's own record and their organization.
 *
 * Its own file rather than `admin-api.js` or `platform-api.js` because these
 * are not one audience's routes: the profile pair is open to every
 * authenticated role, and the organization pair is every TENANT admin's own
 * org rather than a platform admin reading somebody else's.
 */

/** The signed-in person's full record — the profile dialog's read. */
export async function fetchMyProfile() {
  return apiClient("/api/auth/profile");
}

/**
 * Edit your own profile.
 *
 * Deliberately cannot carry email, department, role or active state: identity
 * comes from the token and those four are an admin's to set, department
 * because it decides which manager can see you.
 */
export async function updateMyProfile({ data }) {
  return apiClient("/api/auth/profile", { method: "PATCH", body: data });
}

/** The caller's OWN organization. No id — it comes from their token. */
export async function fetchMyOrganization() {
  return apiClient("/api/admin/organization");
}

/**
 * Name, industry and region only. Plan, contract and seat limit are
 * platform-only and come back read-only on the GET.
 */
export async function updateMyOrganization({ data }) {
  return apiClient("/api/admin/organization", { method: "PATCH", body: data });
}

/**
 * The branch locations and job levels THIS organization offers.
 *
 * Replaces the hardcoded `lib/workforce.js`: the lists are per-tenant data
 * curated by Edstellar at onboarding (`0031`), so a form has to fetch them
 * rather than import them. Read-only for a tenant — only the platform writes.
 */
export async function fetchMyOrgOptions() {
  return apiClient("/api/admin/organization/options");
}
