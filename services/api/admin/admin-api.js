import { apiClient, SERVER_URL } from "@/lib/api-client";

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

/** Attempt history + per-question breakdown for one learner on one package. */
export async function fetchScormAttempts({ packageId, userId }) {
  return apiClient(`/api/admin/scorm/${packageId}/attempts/${userId}`);
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

/* ── Documents ──
   One presign endpoint serves both a lesson's primary document and its
   supporting resources: the key is claimed by whichever row is saved next, so
   the upload does not need to know which it will become. There is no separate
   confirm step — the save itself proves the object exists before recording it,
   and unlike video there is no duration to report back. */

export async function presignDocument({ filename, contentType, sizeBytes }) {
  return apiClient("/api/admin/media/document/presign", {
    method: "POST",
    body: { filename, contentType, sizeBytes },
  });
}

export async function fetchLessonResources({ lessonId }) {
  return apiClient(`/api/admin/lessons/${lessonId}/resources`);
}

export async function createLessonResource({ lessonId, data }) {
  return apiClient(`/api/admin/lessons/${lessonId}/resources`, {
    method: "POST",
    body: data,
  });
}

export async function deleteLessonResource({ resourceId }) {
  return apiClient(`/api/admin/resources/${resourceId}`, { method: "DELETE" });
}

/** Step 3 — tell the API the upload landed, so the key is saved on the lesson. */
export async function confirmLessonVideo({ lessonId, key, durationSeconds }) {
  return apiClient(`/api/admin/lessons/${lessonId}/video/confirm`, {
    method: "POST",
    body: { key, ...(durationSeconds ? { durationSeconds } : {}) },
  });
}

/**
 * Reads a video file's real length without uploading or decoding it.
 *
 * The browser only needs the metadata header, so this is near-instant even for
 * a multi-hundred-megabyte file. Resolves null rather than rejecting: a
 * duration we could not read must not block the upload, it just leaves the
 * lesson without a measured length.
 */
export function readVideoDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    const done = (value) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    probe.onloadedmetadata = () =>
      done(Number.isFinite(probe.duration) ? Math.round(probe.duration) : null);
    probe.onerror = () => done(null);
    probe.src = url;
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

/**
 * SCORM package upload — the zip goes to the API, which extracts it.
 *
 * XMLHttpRequest rather than fetch, for the same reason `uploadToR2` uses it:
 * only XHR reports upload progress, and a hundred-megabyte package pushed by
 * `fetch` gives the admin a spinner that never moves — indistinguishable from
 * a frozen page or a request that never left.
 *
 * The response is parsed defensively. A plain `res.json()` turns any non-JSON
 * reply — a proxy's 413 page, or the Next dev server answering because
 * NEXT_PUBLIC_SERVER_URL points somewhere that is not the API — into
 * "Unexpected token", which tells the admin nothing about what went wrong.
 */
/**
 * Largest SCORM zip the upload path can actually carry.
 *
 * This is NOT an application rule — the API itself accepts any size. It is the
 * smallest ceiling on the network path, and the path has two:
 *
 *   - the origin nginx `client_max_body_size`
 *   - Cloudflare's request-body cap, a hard 100 MiB below Enterprise
 *
 * Cloudflare's is the one that cannot be raised by editing config, so it is
 * the default here. Override it if the origin limit is lower, or once uploads
 * go straight to R2 and stop crossing the proxy at all.
 */
export const SCORM_MAX_BYTES =
  Number(process.env.NEXT_PUBLIC_SCORM_MAX_BYTES) || 100 * 1024 * 1024;

export function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/** Checked before the bytes move, so nothing is pushed only to be refused. */
export function scormSizeError(file) {
  if (!file || file.size <= SCORM_MAX_BYTES) return null;
  return (
    `${file.name} is ${formatBytes(file.size)}, over the ${formatBytes(SCORM_MAX_BYTES)} ` +
    "limit on the upload path. Split the package, or host it externally — " +
    "raising the API's own limit will not help, the cap is in the proxy in front of it."
  );
}

export function uploadScormPackage({
  file,
  title,
  courseId,
  provisional,
  onProgress,
  signal,
}) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("scorm_package", file);
    if (title) fd.append("title", title);
    if (courseId) fd.append("course_id", courseId);
    /**
     * The lesson editor sets this because it has to upload before it can save
     * the lesson. The API leaves such a package provisional — hidden from the
     * SCORM library and swept if no lesson ever claims it — which is what stops
     * a failed save leaving debris an admin can see. The library page does not
     * set it: an upload there IS the finished action.
     */
    if (provisional) fd.append("provisional", "1");

    const url = `${SERVER_URL}/api/admin/scorm/upload`;
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    // The auth cookie is HttpOnly and cross-origin, so it only travels when
    // credentials are explicitly requested — the same reason apiClient sets
    // credentials: "include".
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      // 413 comes from the proxy, never from the API, so it arrives as HTML
      // rather than the { message } envelope. Name the layer that refused it.
      if (xhr.status === 413) {
        reject(
          new Error(
            `The package was rejected as too large (HTTP 413) by a proxy in front ` +
              `of the API, before it reached it. ${formatBytes(file.size)} exceeded ` +
              "either the origin's client_max_body_size or Cloudflare's 100 MB " +
              "request cap.",
          ),
        );
        return;
      }

      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // Not JSON: say who answered instead of quoting a parse error.
        reject(
          new Error(
            `The SCORM upload was answered by ${url} with HTTP ${xhr.status} and ` +
              "a non-JSON body, so it did not reach the API. Check that the API " +
              "server is running and that NEXT_PUBLIC_SERVER_URL points at it.",
          ),
        );
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
        return;
      }
      const error = new Error(body?.message || `SCORM upload failed (HTTP ${xhr.status})`);
      if (body?.errors) error.errors = body.errors;
      reject(error);
    };

    xhr.onerror = () =>
      reject(
        new Error(
          `Could not reach ${url} to upload the package. Check that the API ` +
            "server is running and that its CLIENT_ORIGIN matches this page's origin.",
        ),
      );
    xhr.onabort = () => reject(new Error("SCORM upload cancelled"));

    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(fd);
  });
}


/**
 * Deletes a SCORM package. Used both by the library page and as the lesson
 * editor's rollback when a save fails after its upload succeeded.
 */
export async function deleteScormPackage({ packageId }) {
  return apiClient(`/api/admin/scorm/${packageId}`, { method: "DELETE" });
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

/**
 * Attach / detach an assessment from its course. Only attached assessments are
 * delivered to assigned learners.
 */
export async function attachAssessment({ assessmentId }) {
  return apiClient(`/api/admin/assessments/${assessmentId}/attach`, { method: "POST" });
}

export async function detachAssessment({ assessmentId }) {
  return apiClient(`/api/admin/assessments/${assessmentId}/attach`, { method: "DELETE" });
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

/**
 * Bulk assign a course to several learners.
 *
 * This was imported by `admin-assign-learning-content.jsx` and never existed
 * here, so "Assign all" in a department threw at runtime — the build has been
 * warning about it. The endpoint was always there; only the client wrapper was
 * missing. Field names are the API's snake_case (`user_ids`, `due_date`).
 */
export async function assignUsersBulk({ courseId, userIds, dueDate }) {
  return apiClient(`/api/admin/courses/${courseId}/assignments/bulk`, {
    method: "POST",
    body: { user_ids: userIds, due_date: dueDate || null },
  });
}

/**
 * Issue a certificate by hand. Same story as `assignUsersBulk`: imported by
 * `certificates-table.jsx`, never exported, so the Issue action threw. This
 * endpoint takes camelCase (`userId`, `courseId`) — see IssueCertificateDto.
 */
export async function issueCertificate({ userId, courseId }) {
  return apiClient("/api/admin/certificates", {
    method: "POST",
    body: { userId, courseId },
  });
}

export async function removeAssignment({ assignmentId }) {
  return apiClient(`/api/admin/assignments/${assignmentId}`, { method: "DELETE" });
}
