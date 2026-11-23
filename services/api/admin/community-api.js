import { apiClient } from "@/lib/api-client";

/** Admin moderation of the Learning Community. Org-scoped by the server. */

export async function fetchAdminCommunity({ type, search, page } = {}) {
  const params = new URLSearchParams();
  if (type && type !== "all") params.set("type", type);
  if (search) params.set("search", search);
  if (page) params.set("page", String(page));
  const qs = params.toString();
  return apiClient(`/api/admin/community${qs ? `?${qs}` : ""}`);
}

export async function fetchAdminCommunityPost({ postId }) {
  return apiClient(`/api/admin/community/${postId}`);
}

export async function deleteAdminCommunityPost({ postId }) {
  return apiClient(`/api/admin/community/${postId}`, { method: "DELETE" });
}

export async function deleteAdminCommunityReply({ replyId }) {
  return apiClient(`/api/admin/community/replies/${replyId}`, {
    method: "DELETE",
  });
}

// ── Taking part (any admin, like a learner) ─────────────────────────────────

export async function createAdminCommunityReply({ postId, body, parentReplyId }) {
  return apiClient(`/api/admin/community/${postId}/replies`, {
    method: "POST",
    body: parentReplyId ? { body, parentReplyId } : { body },
  });
}

export async function reactToAdminCommunityPost({ postId, kind }) {
  return apiClient(`/api/admin/community/${postId}/reaction`, {
    method: "PUT",
    body: { kind },
  });
}

export async function removeAdminCommunityReaction({ postId }) {
  return apiClient(`/api/admin/community/${postId}/reaction`, { method: "DELETE" });
}

/** Who reacted: full participant record, per-kind counts and the total. */
export async function fetchAdminCommunityReactors({ postId }) {
  return apiClient(`/api/admin/community/${postId}/reactions`);
}

// ── Groups + discussion creation (moderate_community) ───────────────────────

export async function fetchAdminCommunityGroups() {
  return apiClient("/api/admin/community/groups");
}

export async function createAdminCommunityGroup({ name, description }) {
  return apiClient("/api/admin/community/groups", {
    method: "POST",
    body: { name, description },
  });
}

export async function updateAdminCommunityGroup({ groupId, name, description, archived }) {
  return apiClient(`/api/admin/community/groups/${groupId}`, {
    method: "PATCH",
    body: { name, description, archived },
  });
}

/** Create a discussion thread (admin-curated type), optionally in a group. */
export async function createAdminCommunityDiscussion({ title, body, hashtags, groupId }) {
  return apiClient("/api/admin/community/discussions", {
    method: "POST",
    body: { title, body, hashtags, groupId },
  });
}
