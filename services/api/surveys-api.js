import { apiClient } from "@/lib/api-client";

/**
 * Surveys & Feedback: the admin edits the forms, the learner fills one in.
 *
 * COURSE feedback, not session feedback — `feedback-api.js` is the other one.
 * A session is rated by its three fixed questions and read anonymously by its
 * trainer; a course is rated by whatever the admin wrote and read by the
 * admin, with names.
 */

/* ── Admin: templates ── */

export async function fetchSurveyTemplates() {
  return apiClient("/api/admin/surveys/templates");
}

export async function fetchSurveyTemplate(templateId) {
  return apiClient(`/api/admin/surveys/templates/${templateId}`);
}

export async function createSurveyTemplate(body) {
  return apiClient("/api/admin/surveys/templates", { method: "POST", body });
}

export async function updateSurveyTemplate(templateId, body) {
  return apiClient(`/api/admin/surveys/templates/${templateId}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteSurveyTemplate(templateId) {
  return apiClient(`/api/admin/surveys/templates/${templateId}`, {
    method: "DELETE",
  });
}

/* ── Admin: what learners said ── */

export async function fetchSurveyResponses({
  courseId,
  templateId,
  limit = 50,
  offset = 0,
} = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (courseId) params.set("course_id", String(courseId));
  if (templateId) params.set("template_id", String(templateId));
  return apiClient(`/api/admin/surveys/responses?${params.toString()}`);
}

/** Filter options, reduced from the responses that exist. */
export async function fetchSurveyOptions() {
  return apiClient("/api/admin/surveys/options");
}

/**
 * Which form a course resolves to. Asked of the API rather than computed from
 * the category in the browser — a second copy of the resolution rule is a
 * second rule, free to drift from the one the learner actually gets.
 */
export async function fetchCourseSurvey(courseId) {
  return apiClient(`/api/admin/surveys/courses/${courseId}`);
}

/* ── Learner ── */

/**
 * Courses this learner has finished and not yet rated — the dashboard's
 * prompt. The API decides what counts as pending; this never filters.
 */
export async function fetchPendingSurveys() {
  return apiClient("/api/learner/surveys/pending");
}

/** The form this course asks, and what I already said. `null` means none. */
export async function fetchCourseFeedbackForm(courseId) {
  return apiClient(`/api/learner/courses/${courseId}/feedback`);
}

export async function submitCourseFeedback(courseId, answers) {
  return apiClient(`/api/learner/courses/${courseId}/feedback`, {
    method: "POST",
    body: { answers },
  });
}
