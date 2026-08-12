import { apiClient } from "@/lib/api-client";

/**
 * Learner endpoints. All of them live on the NestJS server — `apiClient`
 * targets it by default and the browser carries the HttpOnly auth cookie.
 */

export async function fetchDashboard() {
  return apiClient("/api/learner/dashboard");
}

export async function fetchMyCourses() {
  return apiClient("/api/learner/courses");
}

export async function fetchCourseDetail({ courseId }) {
  return apiClient(`/api/learner/courses/${courseId}`);
}

export async function fetchLessonContent({ lessonId }) {
  return apiClient(`/api/learner/lessons/${lessonId}`);
}

export async function markLessonComplete({ lessonId }) {
  return apiClient(`/api/learner/lessons/${lessonId}/complete`, {
    method: "POST",
  });
}

export async function fetchProgress() {
  return apiClient("/api/learner/progress");
}

export async function fetchAssessment({ assessmentId }) {
  return apiClient(`/api/learner/assessments/${assessmentId}`);
}

export async function submitAssessmentAttempt({ assessmentId, answers }) {
  return apiClient(`/api/learner/assessments/${assessmentId}/attempt`, {
    method: "POST",
    body: { answers },
  });
}

export async function fetchAssessmentAttempts({ assessmentId }) {
  return apiClient(`/api/learner/assessments/${assessmentId}/attempts`);
}
