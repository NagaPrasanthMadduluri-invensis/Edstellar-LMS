import { apiClient } from "@/lib/api-client";

/**
 * The Course Catalogue — what this learner may add to their own learning.
 *
 * One read for both halves, because the page shows them together and two
 * calls would let the courses and the sessions describe different moments.
 * Every write names only the thing being joined: who is joining comes from
 * the verified token, so there is no user id to pass and none to get wrong.
 */

export async function fetchCatalogue() {
  return apiClient("/api/learner/catalogue");
}

/** Add an open course. Idempotent — the response says whether it was new. */
export async function enrolInCourse(courseId) {
  return apiClient(`/api/learner/catalogue/courses/${courseId}/enrol`, {
    method: "POST",
  });
}

/**
 * Book a session place. When it is full the API puts the learner on the
 * waitlist instead of refusing, and the response says which happened
 * (`state`) and where they landed (`position`).
 */
export async function enrolInSession(sessionId) {
  return apiClient(`/api/learner/catalogue/sessions/${sessionId}/enrol`, {
    method: "POST",
  });
}

/**
 * Give up a place, or leave the queue. Sessions only — there is deliberately
 * no course equivalent, because leaving a course would delete progress the
 * learner has already earned.
 */
export async function leaveSession(sessionId) {
  return apiClient(`/api/learner/catalogue/sessions/${sessionId}/enrol`, {
    method: "DELETE",
  });
}
