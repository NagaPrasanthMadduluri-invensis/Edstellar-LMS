import { apiClient } from "@/lib/api-client";

/** The org admin's referrals. Org-scoped by the server (§10.36). */

export async function fetchReferrals({ limit, offset } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  const qs = params.toString();
  return apiClient(`/api/admin/referrals${qs ? `?${qs}` : ""}`);
}

export async function fetchReferral({ referralId }) {
  return apiClient(`/api/admin/referrals/${referralId}`);
}

/** File a referral. The invite email fires immediately, server-side. */
export async function createReferral({ data }) {
  return apiClient("/api/admin/referrals", { method: "POST", body: data });
}
