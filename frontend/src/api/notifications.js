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

export function createSSEConnection(onMessage, onError) {
  /**
   * Open an EventSource connection to /api/notifications/stream
   * Returns a function to close the connection.
   * Gracefully handles environments where EventSource is not available.
   * 
   * onMessage: (notification) => void - called when a notification arrives
   * onError: (error) => void - called if the connection fails
   */
  
  // Check if EventSource is available (not in test/JSDOM environment)
  if (typeof EventSource === "undefined") {
    // SSE not available, use fallback
    onError(new Error("EventSource not available"));
    return () => {}; // No-op close function
  }

  const eventSource = new EventSource("/api/notifications/stream", {
    withCredentials: true,
  });

  eventSource.addEventListener("message", (event) => {
    try {
      const notification = JSON.parse(event.data);
      onMessage(notification);
    } catch (err) {
      console.error("Failed to parse SSE notification:", err);
    }
  });

  eventSource.addEventListener("error", (error) => {
    console.error("SSE connection error:", error);
    onError(error);
    // EventSource will auto-reconnect, but we report the error
  });

  return () => {
    eventSource.close();
  };
}
