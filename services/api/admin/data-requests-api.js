import { apiClient } from "@/lib/api-client";

/** The org admin's data-request queue. Org-scoped by the server. */

export async function fetchDataRequests({ status, limit, offset } = {}) {
  const params = new URLSearchParams();
  if (status && status !== "all") params.set("status", status);
  if (limit) params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  const qs = params.toString();
  return apiClient(`/api/admin/data-requests${qs ? `?${qs}` : ""}`);
}

export async function respondToDataRequest({ requestId, data }) {
  return apiClient(`/api/admin/data-requests/${requestId}`, {
    method: "PATCH",
    body: data,
  });
}
