import { apiClient } from "@/lib/api-client";

/**
 * Admin skill catalogue + course->skill mapping (BACKEND_STRUCTURE §10.53).
 * Guarded by manage_courses. Skills a course imparts feed the competency record
 * learners gain on completion, which the AI Insights features read.
 */

export async function fetchSkills(archived = false) {
  return apiClient(`/api/admin/skills${archived ? "?archived=true" : ""}`);
}

export async function createSkill({ name, domain }) {
  return apiClient("/api/admin/skills", { method: "POST", body: { name, domain } });
}

export async function updateSkill(id, patch) {
  return apiClient(`/api/admin/skills/${id}`, { method: "PATCH", body: patch });
}

export async function fetchCourseSkills(courseId) {
  return apiClient(`/api/admin/skills/course/${courseId}`);
}

/** Replace the whole set of skills a course imparts. `skills` = [{ skillId, level }]. */
export async function setCourseSkills(courseId, skills) {
  return apiClient(`/api/admin/skills/course/${courseId}`, { method: "PUT", body: { skills } });
}
