import { apiClient } from "@/lib/api-client";

/**
 * The learner's own learning paths.
 *
 * The API resource is still `journeys` and the admin route is still
 * `/admin/journeys` — renaming either would break bookmarks and disagree with
 * the table names (BACKEND_STRUCTURE §10.15 made the same call). Only what a
 * reader is shown says "learning path", which is the vocabulary the product
 * settled on.
 */
export function fetchLearningPaths() {
  return apiClient("/api/learner/journeys");
}

export function fetchLearningPath(id) {
  return apiClient(`/api/learner/journeys/${id}`);
}
