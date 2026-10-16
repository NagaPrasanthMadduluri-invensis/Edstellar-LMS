import { apiClient } from "@/lib/api-client";

/** Direct messages — the inbox, a thread, sending, and the unread count. */

export async function fetchConversations() {
  return apiClient("/api/learner/messages");
}

export async function fetchThread(userId) {
  return apiClient(`/api/learner/messages/${userId}`);
}

export async function sendMessage(userId, body) {
  return apiClient(`/api/learner/messages/${userId}`, {
    method: "POST",
    body: { body },
  });
}

export async function fetchUnreadMessages() {
  return apiClient("/api/learner/messages/unread");
}
