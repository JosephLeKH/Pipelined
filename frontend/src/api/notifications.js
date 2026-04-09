import axios from "axios";

export async function fetchNotifications({ unreadOnly = false } = {}) {
  const params = unreadOnly ? { unread_only: true } : {};
  const { data } = await axios.get("/api/notifications", { params, withCredentials: true });
  return data.data;
}

export async function fetchUnreadCount() {
  const { data } = await axios.get("/api/notifications/unread-count", { withCredentials: true });
  return data.data;
}

export async function markNotificationRead(notificationId) {
  const { data } = await axios.patch(
    `/api/notifications/${notificationId}/read`,
    {},
    { withCredentials: true },
  );
  return data.data;
}

export async function markAllNotificationsRead() {
  const { data } = await axios.patch("/api/notifications/read-all", {}, { withCredentials: true });
  return data.data;
}
