import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";

const NOTIFICATION_KEYS = {
  all: ["notifications"],
  unreadCount: ["notifications", "unread-count"],
};

const UNREAD_POLL_INTERVAL_MS = 60_000;

export function useNotifications({ unreadOnly = false } = {}) {
  return useQuery({
    queryKey: [...NOTIFICATION_KEYS.all, { unreadOnly }],
    queryFn: () => fetchNotifications({ unreadOnly }),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.unreadCount,
    queryFn: fetchUnreadCount,
    refetchInterval: UNREAD_POLL_INTERVAL_MS,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unreadCount });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unreadCount });
    },
  });
}
