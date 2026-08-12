import { apiClient } from "@/lib/api-client";

/* ── Dashboard ── */

export async function fetchAdminDashboard() {
  return apiClient("/api/admin/dashboard");
}

/* ── Courses ── */

export async function fetchAdminCourses() {
  return apiClient("/api/admin/courses");
}

export async function createCourse({ data }) {
  return apiClient("/api/admin/courses", { method: "POST", body: data });
}

export async function updateCourse({ courseId, data }) {
  return apiClient(`/api/admin/courses/${courseId}`, { method: "PUT", body: data });
}

export async function deleteCourse({ courseId }) {
  return apiClient(`/api/admin/courses/${courseId}`, { method: "DELETE" });
}

/* ── Modules ── */

export async function fetchModules({ courseId }) {
  return apiClient(`/api/admin/courses/${courseId}/modules`);
}

export async function createModule({ courseId, data }) {
  return apiClient(`/api/admin/courses/${courseId}/modules`, { method: "POST", body: data });
}

export async function updateModule({ moduleId, data }) {
  return apiClient(`/api/admin/modules/${moduleId}`, { method: "PUT", body: data });
}

export async function deleteModule({ moduleId }) {
  return apiClient(`/api/admin/modules/${moduleId}`, { method: "DELETE" });
}

/* ── Lessons ── */

export async function fetchLessons({ moduleId }) {
  return apiClient(`/api/admin/modules/${moduleId}/lessons`);
}

export async function createLesson({ moduleId, data }) {
  return apiClient(`/api/admin/modules/${moduleId}/lessons`, { method: "POST", body: data });
}

export async function updateLesson({ lessonId, data }) {
  return apiClient(`/api/admin/lessons/${lessonId}`, { method: "PUT", body: data });
}

export async function deleteLesson({ lessonId }) {
  return apiClient(`/api/admin/lessons/${lessonId}`, { method: "DELETE" });
}

/* ── Assessments ── */

export async function fetchAssessments({ courseId }) {
  return apiClient(`/api/admin/courses/${courseId}/assessments`);
}

export async function createAssessment({ courseId, data }) {
  return apiClient(`/api/admin/courses/${courseId}/assessments`, { method: "POST", body: data });
}

export async function fetchAssessmentDetail({ assessmentId }) {
  return apiClient(`/api/admin/assessments/${assessmentId}`);
}

export async function updateAssessment({ assessmentId, data }) {
  return apiClient(`/api/admin/assessments/${assessmentId}`, { method: "PUT", body: data });
}

export async function deleteAssessment({ assessmentId }) {
  return apiClient(`/api/admin/assessments/${assessmentId}`, { method: "DELETE" });
}

export async function addQuestion({ assessmentId, data }) {
  return apiClient(`/api/admin/assessments/${assessmentId}/questions`, { method: "POST", body: data });
}

export async function updateQuestion({ questionId, data }) {
  return apiClient(`/api/admin/questions/${questionId}`, { method: "PUT", body: data });
}

export async function deleteQuestion({ questionId }) {
  return apiClient(`/api/admin/questions/${questionId}`, { method: "DELETE" });
}

/* ── Users ── */

export async function fetchUsers() {
  return apiClient("/api/admin/users");
}

export async function createUser({ data }) {
  return apiClient("/api/admin/users", { method: "POST", body: data });
}

export async function updateUser({ userId, data }) {
  return apiClient(`/api/admin/users/${userId}`, { method: "PUT", body: data });
}

export async function bulkCreateUsers({ users }) {
  return apiClient("/api/admin/users/bulk", { method: "POST", body: { users } });
}

export async function exportReport() {
  return apiClient("/api/admin/export");
}

export async function downloadUserTemplate() {
  return apiClient("/api/admin/users/template");
}

export async function toggleUserStatus({ userId, is_active }) {
  return apiClient(`/api/admin/users/${userId}`, { method: "PATCH", body: { is_active } });
}

export async function deleteUser({ userId }) {
  return apiClient(`/api/admin/users/${userId}`, { method: "DELETE" });
}

/* ── Assignments ── */

export async function fetchAssignments({ courseId }) {
  return apiClient(`/api/admin/courses/${courseId}/assignments`);
}

export async function assignUser({ courseId, userId, dueDate }) {
  return apiClient(`/api/admin/courses/${courseId}/assignments`, {
    method: "POST", body: { user_id: userId, due_date: dueDate || null },
  });
}

export async function removeAssignment({ assignmentId }) {
  return apiClient(`/api/admin/assignments/${assignmentId}`, { method: "DELETE" });
}
