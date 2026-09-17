import { apiClient } from "@/lib/api-client";

/**
 * The super-admin (platform) API.
 *
 * Kept apart from `admin-api.js` on purpose: these routes sit behind
 * `@PlatformAdmin()` and cross tenants, and mixing them into the admin client
 * is how a tenant-facing page ends up calling one by accident. Different
 * audience, different file — the same split the controllers already make
 * (BACKEND_STRUCTURE §2.2).
 */

/* ── Service requests, across every tenant ── */

export async function fetchPlatformServiceRequests({ status, organizationId } = {}) {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (organizationId) query.set("organization_id", String(organizationId));
  const qs = query.toString();
  return apiClient(`/api/platform/service-requests${qs ? `?${qs}` : ""}`);
}

export async function fetchPlatformServiceRequest({ requestId }) {
  return apiClient(`/api/platform/service-requests/${requestId}`);
}

/** Move a request along and write the note its tenant admin reads back. */
export async function respondToServiceRequest({ requestId, data }) {
  return apiClient(`/api/platform/service-requests/${requestId}`, {
    method: "PATCH",
    body: data,
  });
}

/* ── Tenant directory ── */

/**
 * Every tenant with its profile, contract and usage counts.
 *
 * `contract_state` and `contract_days_left` arrive DERIVED from the API — the
 * browser never recomputes them, so there is one definition of "expiring".
 */
export async function fetchTenants() {
  return apiClient("/api/platform/organizations/tenants");
}

/**
 * Patch a tenant. Omitted keys are left alone; an explicit null clears.
 * Send only what changed — posting the whole object would rewrite commercial
 * terms the form never showed.
 */
export async function updateTenant({ tenantId, data }) {
  return apiClient(`/api/platform/organizations/${tenantId}`, {
    method: "PATCH",
    body: data,
  });
}

/* ── Access control ── */

/**
 * Every privileged (admin-portal) account across every tenant.
 *
 * `level` arrives derived from the role — Owner or Admin, the only two this
 * system actually enforces.
 */
export async function fetchPrivilegedAccounts() {
  return apiClient("/api/platform/organizations/access");
}

/* ── Billing ── */

export async function fetchInvoices({ organizationId, status } = {}) {
  const q = new URLSearchParams();
  if (organizationId) q.set("organization_id", String(organizationId));
  if (status) q.set("status", status);
  const qs = q.toString();
  return apiClient(`/api/platform/billing/invoices${qs ? `?${qs}` : ""}`);
}

export async function fetchInvoice({ invoiceId }) {
  return apiClient(`/api/platform/billing/invoices/${invoiceId}`);
}

export async function createInvoice({ data }) {
  return apiClient("/api/platform/billing/invoices", { method: "POST", body: data });
}

export async function updateInvoice({ invoiceId, data }) {
  return apiClient(`/api/platform/billing/invoices/${invoiceId}`, { method: "PATCH", body: data });
}

export async function deleteInvoice({ invoiceId }) {
  return apiClient(`/api/platform/billing/invoices/${invoiceId}`, { method: "DELETE" });
}

/** Record money that arrived. Refused on a draft, a void, or an overpayment. */
export async function recordPayment({ invoiceId, data }) {
  return apiClient(`/api/platform/billing/invoices/${invoiceId}/payments`, {
    method: "POST", body: data,
  });
}

/* ── Seats ── */

export async function fetchSeatRequests({ status } = {}) {
  const qs = status ? `?status=${status}` : "";
  return apiClient(`/api/platform/seats/requests${qs}`);
}

/** Approving WRITES the tenant's seat limit — not just a status. */
export async function respondToSeatRequest({ requestId, data }) {
  return apiClient(`/api/platform/seats/requests/${requestId}`, {
    method: "PATCH", body: data,
  });
}

export async function setSeatLimit({ organizationId, seatLimit }) {
  return apiClient(`/api/platform/seats/organizations/${organizationId}`, {
    method: "PUT", body: { seat_limit: seatLimit },
  });
}

/* ── Support sessions ──
 *
 * Opening a tenant signs the platform admin in AS that tenant's owner admin,
 * for an hour. The cookie is swapped server-side; nothing here holds a token.
 */

/** Returns `{ user, organization }` for the tenant just entered. */
export async function openSupportSession({ organizationId }) {
  return apiClient("/api/auth/impersonate", {
    method: "POST",
    body: { organization_id: organizationId },
  });
}

/**
 * End the session and get the platform admin's own token back.
 *
 * NOT on a `/platform` route: while impersonating, every one of those answers
 * 403 by design, including the one that would let you leave.
 */
export async function exitSupportSession() {
  return apiClient("/api/auth/exit-impersonation", { method: "POST" });
}

/**
 * Provision a tenant: the organization, its three system roles and its FIRST
 * ADMIN, in one transaction server-side.
 *
 * The admin is not optional. An organization with no admin account is one
 * nobody can sign into — the directory renders it as a warning and the
 * support-session button is disabled on it — so it is not a state this form
 * is allowed to produce.
 */
export async function createTenant({ data }) {
  return apiClient("/api/platform/organizations", { method: "POST", body: data });
}
