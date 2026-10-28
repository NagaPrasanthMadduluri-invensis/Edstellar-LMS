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
