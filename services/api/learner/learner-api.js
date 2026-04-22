import { apiClient } from "@/lib/api-client";

export async function fetchDashboard({ token }) {
  return apiClient("/api/learner/dashboard", { token });
}

export async function fetchMyCourses({ token }) {
  return apiClient("/api/learner/courses", { token });
}

export async function fetchCourseDetail({ token, courseId }) {
  return apiClient(`/api/learner/courses/${courseId}`, { token });
}

export async function fetchLessonContent({ token, lessonId }) {
  return apiClient(`/api/learner/lessons/${lessonId}`, { token });
}

export async function markLessonComplete({ token, lessonId }) {
  return apiClient(`/api/learner/lessons/${lessonId}/complete`, {
    method: "POST",
    token,
  });
}

export async function fetchAssessment({ token, assessmentId }) {
  return apiClient(`/api/learner/assessments/${assessmentId}`, { token });
}

export async function submitAssessmentAttempt({ token, assessmentId, answers }) {
  return apiClient(`/api/learner/assessments/${assessmentId}/attempt`, {
    method: "POST",
    token,
    body: { answers },
  });
}

export async function fetchAssessmentAttempts({ token, assessmentId }) {
  return apiClient(`/api/learner/assessments/${assessmentId}/attempts`, { token });
}
