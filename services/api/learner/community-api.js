import { apiClient } from "@/lib/api-client";

/**
 * Learning Community endpoints (learner side). Everything is org-scoped by the
 * server; the browser carries the HttpOnly auth cookie.
 */

export async function fetchCommunityFeed({ type, hashtag, group, cursor } = {}) {
  const params = new URLSearchParams();
  if (type && type !== "all") params.set("type", type);
  if (hashtag) params.set("hashtag", hashtag);
  if (group) params.set("group", group);
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return apiClient(`/api/learner/community${qs ? `?${qs}` : ""}`);
}

export async function fetchCommunityPost({ postId }) {
  return apiClient(`/api/learner/community/${postId}`);
}

export async function createCommunityPost({ type, title, body, certificateId, hashtags, groupId }) {
  return apiClient("/api/learner/community", {
    method: "POST",
    body: { type, title, body, certificateId, hashtags, groupId },
  });
}

// ── Groups ──────────────────────────────────────────────────────────────────

/** Groups the learner can browse and join (with counts + joined state). */
export async function fetchCommunityGroups() {
  return apiClient("/api/learner/community/groups");
}

export async function joinCommunityGroup({ groupId }) {
  return apiClient(`/api/learner/community/groups/${groupId}/join`, { method: "POST" });
}

export async function leaveCommunityGroup({ groupId }) {
  return apiClient(`/api/learner/community/groups/${groupId}/join`, { method: "DELETE" });
}

export async function deleteCommunityPost({ postId }) {
  return apiClient(`/api/learner/community/${postId}`, { method: "DELETE" });
}

export async function createCommunityReply({ postId, body }) {
  return apiClient(`/api/learner/community/${postId}/replies`, {
    method: "POST",
    body: { body },
  });
}

export async function deleteCommunityReply({ replyId }) {
  return apiClient(`/api/learner/community/replies/${replyId}`, {
    method: "DELETE",
  });
}

export async function likeCommunityPost({ postId }) {
  return apiClient(`/api/learner/community/${postId}/like`, { method: "POST" });
}

export async function unlikeCommunityPost({ postId }) {
  return apiClient(`/api/learner/community/${postId}/like`, { method: "DELETE" });
}

/** The people who liked a post, newest first. */
export async function fetchCommunityLikers({ postId }) {
  return apiClient(`/api/learner/community/${postId}/likes`);
}

/** The learner's own certificates, for the achievement composer. */
export async function fetchMyCertificates() {
  return apiClient("/api/learner/certificates");
}

// ── Hashtags ──────────────────────────────────────────────────────────────

/** Autocomplete suggestions for a partial tag. */
export async function suggestHashtags({ q } = {}) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiClient(`/api/learner/community/hashtags${qs}`);
}

/** Trending hashtags (last 30 days). */
export async function fetchTrendingHashtags() {
  return apiClient("/api/learner/community/hashtags/trending");
}

// ── Kudos ───────────────────────────────────────────────────────────────────

/** Search people to recognise (active learner-portal colleagues, not you). */
export async function searchPeople({ q } = {}) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiClient(`/api/learner/community/people${qs}`);
}

export async function giveKudos({ recipientUserId, message }) {
  return apiClient("/api/learner/community/kudos", {
    method: "POST",
    body: { recipientUserId, message },
  });
}

/** The caller's own kudos received — count + recent (My Profile panel). */
export async function fetchKudosSummary() {
  return apiClient("/api/learner/community/kudos/summary");
}

/** The Kudos leaderboard — most kudos received. */
export async function fetchKudosLeaderboard() {
  return apiClient("/api/learner/community/kudos/leaderboard");
}
