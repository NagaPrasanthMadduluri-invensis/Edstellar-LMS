import { apiClient } from "@/lib/api-client";

/**
 * Session feedback. Two audiences, and they are deliberately not symmetric:
 * a learner writes it with their name attached, a trainer reads it without.
 *
 * Neither route takes a user id — the learner's identity comes from the
 * verified token, and the trainer's own sessions are a SQL predicate rather
 * than a filter this file passes.
 */

/** Completed sessions this learner attended, with what they already said. */
export async function fetchLearnerFeedbackSessions() {
  return apiClient("/api/learner/feedback/sessions");
}

export async function submitSessionFeedback({ sessionId, ...body }) {
  return apiClient(`/api/learner/feedback/sessions/${sessionId}`, {
    method: "POST",
    body,
  });
}

/** The trainer's page: per-session averages plus the anonymised responses. */
export async function fetchTrainerFeedback({ sessionId, limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (sessionId) params.set("session_id", String(sessionId));
  return apiClient(`/api/trainer/feedback?${params.toString()}`);
}
