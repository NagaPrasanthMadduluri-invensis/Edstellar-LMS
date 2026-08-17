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

/* ── Lesson media (video + captions in R2) ── */

export async function fetchLessonMedia({ lessonId }) {
  return apiClient(`/api/admin/lessons/${lessonId}/media`);
}

/** Step 1 — ask for a URL the browser can PUT the video straight to R2. */
export async function presignLessonVideo({ lessonId, filename, contentType, sizeBytes }) {
  return apiClient(`/api/admin/lessons/${lessonId}/video/presign`, {
    method: "POST",
    body: { filename, contentType, sizeBytes },
  });
}

/**
 * Same, for a lesson that does not exist yet. The form uploads as soon as a
 * file is picked so the save button can wait on it, and at that point there is
 * no lesson id to presign against.
 */
export async function presignNewVideo({ filename, contentType, sizeBytes }) {
  return apiClient("/api/admin/media/video/presign", {
    method: "POST",
    body: { filename, contentType, sizeBytes },
  });
}

/** Step 3 — tell the API the upload landed, so the key is saved on the lesson. */
export async function confirmLessonVideo({ lessonId, key }) {
  return apiClient(`/api/admin/lessons/${lessonId}/video/confirm`, {
    method: "POST",
    body: { key },
  });
}

export async function deleteLessonVideo({ lessonId }) {
  return apiClient(`/api/admin/lessons/${lessonId}/video`, { method: "DELETE" });
}

export async function deleteLessonCaptions({ lessonId }) {
  return apiClient(`/api/admin/lessons/${lessonId}/captions`, { method: "DELETE" });
}

/**
 * Step 2 — the actual bytes, straight from the browser to R2.
 *
 * XMLHttpRequest rather than fetch: only XHR reports upload progress, and a
 * multi-hundred-megabyte video with no progress bar reads as a frozen page.
 * Nothing here touches the API server, so no auth cookie is sent — the
 * signature in the URL is the authorisation.
 */
export function uploadToR2({ uploadUrl, file, contentType, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (HTTP ${xhr.status}). Check the bucket's CORS rules.`));
    xhr.onerror = () =>
      reject(new Error("Upload failed — the browser could not reach R2. Check the bucket's CORS rules."));
    xhr.onabort = () => reject(new Error("Upload cancelled"));

    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
}

/** Captions go through the API, which converts SRT to the WebVTT `<track>` needs. */
export async function uploadLessonCaptions({ lessonId, file }) {
  const fd = new FormData();
  fd.append("captions", file);
  return apiClient(`/api/admin/lessons/${lessonId}/captions`, {
    method: "POST",
    body: fd,
  });
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
