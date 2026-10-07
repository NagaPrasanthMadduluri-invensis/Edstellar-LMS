import { apiClient } from "@/lib/api-client";

/** The organization's own outbox — what was sent, what failed, and why. */
export function fetchEmailOutbox(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === "" || value === null || value === undefined || value === "all") continue;
    params.set(key, String(value));
  }
  const q = params.toString();
  return apiClient(`/api/admin/email/outbox${q ? `?${q}` : ""}`);
}

/** Put one failed message back in the queue. Refused for any other status. */
export function resendEmail(id) {
  return apiClient(`/api/admin/email/outbox/${id}/resend`, { method: "POST" });
}
