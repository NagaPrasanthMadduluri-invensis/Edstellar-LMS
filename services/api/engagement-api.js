import { apiClient } from "@/lib/api-client";

/**
 * Engagement tracking + the engagement-vs-learning trend
 * (BACKEND_STRUCTURE §10.55). Engagement is ACTIVE time (cursor/keyboard moving,
 * idle over 5 minutes excluded); learning hours stay the §10.4 definition.
 */

/** Post a batch of active seconds. Best-effort telemetry — callers ignore errors. */
export async function pingEngagement(seconds) {
  return apiClient("/api/engagement/ping", {
    method: "POST",
    body: { seconds },
  });
}

export async function fetchLearnerEngagementTrend(granularity = "weekly") {
  return apiClient(`/api/learner/engagement/trend?granularity=${granularity}`);
}

export async function fetchAdminEngagementTrend(granularity = "weekly") {
  return apiClient(`/api/admin/engagement/trend?granularity=${granularity}`);
}
