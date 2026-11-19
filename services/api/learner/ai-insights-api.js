import { apiClient } from "@/lib/api-client";

/**
 * The learner's AI recommendations (BACKEND_STRUCTURE §10.54, spec ai-insights.md).
 *
 * The read returns `{ enabled, insight }`: `enabled` is false when the feature
 * is switched off for the deployment, in which case the panel renders nothing.
 * `insight` is `{ payload, generatedAt, model }` or null when none has been
 * generated yet. The payload is advice about the learner's own courses, built
 * server-side from an anonymised context, never a client-side fabrication.
 */
export async function fetchLearnerInsights() {
  return apiClient("/api/learner/ai/insights");
}

/**
 * Regenerate on demand (the panel's Refresh / Generate button). Rate-limited
 * server-side to five an hour per learner, so the button should surface a 429
 * message rather than retry in a loop.
 */
export async function refreshLearnerInsights() {
  return apiClient("/api/learner/ai/insights/refresh", { method: "POST" });
}
