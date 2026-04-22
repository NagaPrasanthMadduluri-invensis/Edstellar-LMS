import { apiClient } from "@/lib/api-client";

/* ── Dashboard ── */

export async function fetchAdminDashboard({ token }) {
  return apiClient("/api/admin/dashboard", { token });
}

/* ── Courses ── */

export async function fetchAdminCourses({ token }) {
  return apiClient("/api/admin/courses", { token });
}

export async function createCourse({ token, data }) {
  return apiClient("/api/admin/courses", { method: "POST", token, body: data });
}

export async function updateCourse({ token, courseId, data }) {
  return apiClient(`/api/admin/courses/${courseId}`, { method: "PUT", token, body: data });
}

export async function deleteCourse({ token, courseId }) {
  return apiClient(`/api/admin/courses/${courseId}`, { method: "DELETE", token });
}

/* ── Modules ── */

export async function fetchModules({ token, courseId }) {
  return apiClient(`/api/admin/courses/${courseId}/modules`, { token });
}

export async function createModule({ token, courseId, data }) {
  return apiClient(`/api/admin/courses/${courseId}/modules`, { method: "POST", token, body: data });
}

export async function updateModule({ token, moduleId, data }) {
  return apiClient(`/api/admin/modules/${moduleId}`, { method: "PUT", token, body: data });
}

export async function deleteModule({ token, moduleId }) {
  return apiClient(`/api/admin/modules/${moduleId}`, { method: "DELETE", token });
}

/* ── Lessons ── */

export async function fetchLessons({ token, moduleId }) {
  return apiClient(`/api/admin/modules/${moduleId}/lessons`, { token });
}

export async function createLesson({ token, moduleId, data }) {
  return apiClient(`/api/admin/modules/${moduleId}/lessons`, { method: "POST", token, body: data });
}

export async function updateLesson({ token, lessonId, data }) {
  return apiClient(`/api/admin/lessons/${lessonId}`, { method: "PUT", token, body: data });
}

export async function deleteLesson({ token, lessonId }) {
  return apiClient(`/api/admin/lessons/${lessonId}`, { method: "DELETE", token });
}

/* ── Assessments ── */

export async function fetchAssessments({ token, courseId }) {
  return apiClient(`/api/admin/courses/${courseId}/assessments`, { token });
}

export async function createAssessment({ token, courseId, data }) {
  return apiClient(`/api/admin/courses/${courseId}/assessments`, { method: "POST", token, body: data });
}

export async function fetchAssessmentDetail({ token, assessmentId }) {
  return apiClient(`/api/admin/assessments/${assessmentId}`, { token });
}

export async function updateAssessment({ token, assessmentId, data }) {
  return apiClient(`/api/admin/assessments/${assessmentId}`, { method: "PUT", token, body: data });
}

export async function deleteAssessment({ token, assessmentId }) {
  return apiClient(`/api/admin/assessments/${assessmentId}`, { method: "DELETE", token });
}

export async function addQuestion({ token, assessmentId, data }) {
  return apiClient(`/api/admin/assessments/${assessmentId}/questions`, { method: "POST", token, body: data });
}

export async function updateQuestion({ token, questionId, data }) {
  return apiClient(`/api/admin/questions/${questionId}`, { method: "PUT", token, body: data });
}

export async function deleteQuestion({ token, questionId }) {
  return apiClient(`/api/admin/questions/${questionId}`, { method: "DELETE", token });
}

/* ── Users ── */

export async function fetchUsers({ token }) {
  return apiClient("/api/admin/users", { token });
}

export async function createUser({ token, data }) {
  return apiClient("/api/admin/users", { method: "POST", token, body: data });
}

export async function toggleUserStatus({ token, userId, is_active }) {
  return apiClient(`/api/admin/users/${userId}`, { method: "PATCH", token, body: { is_active } });
}

export async function deleteUser({ token, userId }) {
  return apiClient(`/api/admin/users/${userId}`, { method: "DELETE", token });
}

/* ── Assignments ── */

export async function fetchAssignments({ token, courseId }) {
  return apiClient(`/api/admin/courses/${courseId}/assignments`, { token });
}

export async function assignUser({ token, courseId, userId }) {
  return apiClient(`/api/admin/courses/${courseId}/assignments`, {
    method: "POST", token, body: { user_id: userId },
  });
}

export async function removeAssignment({ token, assignmentId }) {
  return apiClient(`/api/admin/assignments/${assignmentId}`, { method: "DELETE", token });
}
