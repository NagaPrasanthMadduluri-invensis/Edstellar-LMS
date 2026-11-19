import { apiClient } from "@/lib/api-client";

/**
 * The admin's AI org briefing (BACKEND_STRUCTURE §10.54, spec ai-insights.md).
 *
 * `{ enabled, insight }`: `enabled` is false when the feature is off for the
 * deployment, in which case the panel renders nothing. `insight` is
 * `{ payload, generatedAt, model }` or null. The payload is advice about the
 * organisation's learning health, built server-side from org aggregates, never
 * a client-side computation.
 */
export async function fetchAdminInsights() {
  return apiClient("/api/admin/ai/insights");
}

/** Regenerate on demand (rate-limited to five an hour per admin, server-side). */
export async function refreshAdminInsights() {
  return apiClient("/api/admin/ai/insights/refresh", { method: "POST" });
}
