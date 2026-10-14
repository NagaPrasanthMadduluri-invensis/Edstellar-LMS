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
