/**
 * Admin course preview: where the learner screens link and which endpoints
 * they read when they are rendered for an admin (nothing is recorded).
 *
 * The learner components take a `preview` flag and build every in-app link and
 * request through these helpers, so the two modes cannot drift apart.
 */

/** The course page: `/my-courses/:id` for a learner, the preview route for an admin. */
export function courseBasePath(courseId, preview = false) {
  return preview ? `/admin/courses/${courseId}/preview` : `/my-courses/${courseId}`;
}

export function lessonPath(courseId, lessonId, preview = false) {
  return `${courseBasePath(courseId, preview)}/lessons/${lessonId}`;
}

export function assessmentPath(courseId, assessmentId, preview = false) {
  return `${courseBasePath(courseId, preview)}/assessments/${assessmentId}`;
}

/** Where "Back to course" goes: the admin's course editor in preview. */
export function backToCoursePath(courseId, preview = false) {
  return preview ? `/admin/courses/${courseId}` : `/my-courses/${courseId}`;
}

/** The admin course page entry point for the "Preview as learner" button. */
export function previewEntryPath(courseId) {
  return courseBasePath(courseId, true);
}

export const previewEndpoints = {
  course: (courseId) => `/api/admin/courses/${courseId}/preview`,
  lesson: (lessonId) => `/api/admin/lessons/${lessonId}/preview`,
  // INTEGER lesson id only.
  media: (lessonId) => `/api/admin/lessons/${lessonId}/media`,
  resourceUrl: (resourceId) => `/api/admin/resources/${resourceId}/url`,
  assessment: (assessmentId) => `/api/admin/assessments/${assessmentId}/preview`,
  assessmentAttempt: (assessmentId) => `/api/admin/assessments/${assessmentId}/preview-attempt`,
  // INTEGER package id only.
  scormPackage: (packageId) => `/api/admin/scorm/${packageId}`,
};

/** Course state label for the preview banner. */
export function courseStateLabel(course) {
  if (course?.archived_at) return "Archived";
  return Number(course?.is_active) === 1 || course?.is_active === true ? "Published" : "Draft";
}
