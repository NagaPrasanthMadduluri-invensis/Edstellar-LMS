import { apiClient } from "@/lib/api-client";

/**
 * The bell, for every portal.
 *
 * Its own file rather than one of the audience clients: a learner, a trainer,
 * an org admin and a platform admin all call these, so filing them under
 * `admin-api.js` or `platform-api.js` would be wrong three times out of four.
 *
 * No route takes a user id — identity comes from the verified token.
 */

export async function fetchNotifications({ limit = 20, offset = 0 } = {}) {
  return apiClient(`/api/notifications?limit=${limit}&offset=${offset}`);
}

/** Opening the bell marks everything read; that is what clears the badge. */
export async function markAllNotificationsRead() {
  return apiClient("/api/notifications/read", { method: "POST" });
}

export async function markNotificationRead({ id }) {
  return apiClient(`/api/notifications/${id}/read`, { method: "POST" });
}
