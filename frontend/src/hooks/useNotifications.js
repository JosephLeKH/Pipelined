import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  createSSEConnection,
} from "../api/notifications";

const NOTIFICATION_KEYS = {
  all: ["notifications"],
  unreadCount: ["notifications", "unread-count"],
};

const UNREAD_POLL_INTERVAL_MS = 60_000;

export function useNotifications({ unreadOnly = false } = {}) {
  const queryClient = useQueryClient();
  const [realtimeOffline, setRealtimeOffline] = useState(false);

  // Open SSE connection and update cache on new notifications
  useEffect(() => {
    let closeConnection;

    const connectSSE = async () => {
      try {
        closeConnection = createSSEConnection(
          (notification) => {
            // Update the notifications list with new notification
            queryClient.setQueryData(
              [...NOTIFICATION_KEYS.all, { unreadOnly }],
              (oldData) => {
                if (!oldData) return oldData;
                // Add new notification to the top (most recent first)
                return [notification, ...oldData];
              }
            );

            // Update unread count
            if (!notification.read) {
              queryClient.setQueryData(NOTIFICATION_KEYS.unreadCount, (oldData) => {
                if (!oldData) return oldData;
                return { count: (oldData.count || 0) + 1 };
              });
            }
          },
          (error) => {
            console.error("SSE connection failed, falling back to polling:", error);
            setRealtimeOffline(true);
          }
        );
      } catch (err) {
        console.error("Failed to open SSE connection:", err);
      }
    };

    connectSSE();

    return () => {
      if (closeConnection) {
        closeConnection();
      }
    };
  }, [queryClient, unreadOnly]);

  const query = useQuery({
    queryKey: [...NOTIFICATION_KEYS.all, { unreadOnly }],
    queryFn: () => fetchNotifications({ unreadOnly }),
  });

  return { ...query, realtimeOffline };
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
