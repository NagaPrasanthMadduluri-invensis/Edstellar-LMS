import { apiClient, SERVER_URL } from "@/lib/api-client";

/** Direct messages — the inbox, a thread, sending, and the unread count. */

/** Direct URL for a message attachment (same-site, so the cookie rides along). */
export function messageAttachmentUrl(messageId) {
  return `${SERVER_URL}/api/learner/messages/attachments/${messageId}/file`;
}

export async function fetchConversations() {
  return apiClient("/api/learner/messages");
}

export async function fetchThread(userId) {
  return apiClient(`/api/learner/messages/${userId}`);
}

/** Send a message, optionally with a file. Always multipart so the one endpoint
 *  handles both (the server's FileInterceptor accepts a bodied form). */
export async function sendMessage(userId, body, file) {
  const form = new FormData();
  if (body) form.set("body", body);
  if (file) form.set("file", file);
  return apiClient(`/api/learner/messages/${userId}`, { method: "POST", body: form });
}

export async function fetchUnreadMessages() {
  return apiClient("/api/learner/messages/unread");
}
