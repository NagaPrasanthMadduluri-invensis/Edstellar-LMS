import { apiClient, SERVER_URL } from "@/lib/api-client";

/**
 * External certifications — training done elsewhere, counted here once a
 * manager and an admin have both confirmed it.
 *
 * Four audiences, four paths, and none of them takes a user id: who is
 * claiming and who is deciding both come from the verified token.
 */

/* ── Learner ── */

export async function fetchMyExternalCertifications() {
  return apiClient("/api/learner/external-certifications");
}

/**
 * Submit a claim. Multipart, so the five fields and the file arrive in one
 * request — `apiClient` leaves FormData's own Content-Type alone, boundary
 * included, which is why nothing is set here.
 */
export async function submitExternalCertification(fields, file) {
  const body = new FormData();
  Object.entries(fields).forEach(([k, v]) => body.append(k, String(v)));
  body.append("file", file);
  return apiClient("/api/learner/external-certifications", {
    method: "POST",
    body,
  });
}

/* ── Manager ── */

export async function fetchManagerCertificationQueue() {
  return apiClient("/api/learner/team/external-certifications");
}

export async function decideAsManager(id, approve, note) {
  return apiClient(`/api/learner/team/external-certifications/${id}`, {
    method: "PATCH",
    body: { approve, note: note || null },
  });
}

/* ── Admin ── */

export async function fetchAdminCertificationQueue({ status } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const qs = params.toString();
  return apiClient(`/api/admin/external-certifications${qs ? `?${qs}` : ""}`);
}

export async function decideAsAdmin(id, approve, note) {
  return apiClient(`/api/admin/external-certifications/${id}`, {
    method: "PATCH",
    body: { approve, note: note || null },
  });
}

/**
 * Where the uploaded certificate is read from.
 *
 * A plain URL rather than a fetch: the file is opened in a new tab, and the
 * route streams it with `Content-Disposition: inline` so a PDF lands in the
 * browser's viewer. The auth cookie travels because it is the same site —
 * which is also why this must never become an anchor to a public path.
 */
export function certificateFileUrl(id) {
  return `${SERVER_URL}/api/external-certifications/${id}/file`;
}
