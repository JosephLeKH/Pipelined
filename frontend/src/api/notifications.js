/** API functions for /api/notifications. */

import { client } from "./client";

export async function fetchNotifications({ unreadOnly = false } = {}) {
  const params = unreadOnly ? { unread_only: true } : {};
  return client.get("/notifications", { params });
}

export async function fetchUnreadCount() {
  return client.get("/notifications/unread-count");
}

export async function markNotificationRead(notificationId) {
  return client.patch(`/notifications/${notificationId}/read`);
}

export async function markAllNotificationsRead() {
  return client.patch("/notifications/read-all");
}
