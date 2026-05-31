/** Bell icon with unread badge and dropdown notification panel. */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import Bell from "lucide-react/dist/esm/icons/bell";
import BookOpen from "lucide-react/dist/esm/icons/book-open";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import Check from "lucide-react/dist/esm/icons/check";
import Clock from "lucide-react/dist/esm/icons/clock";
import Sun from "lucide-react/dist/esm/icons/sun";

import { formatSavedAgo } from "../lib/dateUtils";
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from "../hooks/useNotifications";
import { Button } from "./ui/button";

const UNREAD_PILL_THRESHOLD = 9;
const NOTIFICATION_PANEL_WIDTH_PX = 360;
const NOTIFICATION_PANEL_MAX_HEIGHT_PX = 480;
const NOTIFICATION_ROW_HEIGHT_PX = 56;

const TYPE_ICONS = {
  stale_app: Clock,
  interview_tomorrow: CalendarClock,
  follow_up_due: Bell,
  morning_brief_ready: Sun,
  interview_prep_ready: BookOpen,
};

const TYPE_ICON_COLORS = {
  stale_app: "text-text-3",
  interview_tomorrow: "text-status-info",
  follow_up_due: "text-brand-600",
  morning_brief_ready: "text-status-warn",
  interview_prep_ready: "text-status-violet",
};

function UnreadIndicator({ unreadCount }) {
  if (unreadCount <= 0) return null;

  return (
    <span
      aria-hidden="true"
      className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[0.625rem] font-semibold leading-none text-white"
    >
      {unreadCount > UNREAD_PILL_THRESHOLD ? `${UNREAD_PILL_THRESHOLD}+` : unreadCount}
    </span>
  );
}

function NotificationItem({ notification, onNavigate }) {
  const { mutate: markRead } = useMarkRead();
  const Icon = TYPE_ICONS[notification.type] ?? Bell;
  const iconColor = TYPE_ICON_COLORS[notification.type] ?? "text-text-3";
  const timeLabel = formatSavedAgo(new Date(notification.created_at));

  function handleClick() {
    if (!notification.read) {
      markRead(notification.id, {
        onError: () => toast.error("Couldn't mark as read"),
      });
    }
    if (notification.action_url) {
      onNavigate(notification.action_url);
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        className="flex h-14 w-full items-start gap-3 border-b border-border-1 bg-surface-0 px-4 py-3 text-left hover:bg-surface-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-[-2px] dark:focus-visible:outline-1"
      >
        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-1">{notification.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-text-2">{notification.body}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {timeLabel ? (
            <span className="whitespace-nowrap text-xs text-text-3">{timeLabel}</span>
          ) : null}
          {!notification.read ? (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600"
              aria-label="Unread"
            />
          ) : (
            <span className="h-1.5 w-1.5 shrink-0" aria-hidden="true" />
          )}
        </div>
      </button>
    </li>
  );
}

function NotificationEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <Check className="h-5 w-5 text-text-3" aria-hidden="true" />
      <p className="text-sm text-text-2">You&apos;re caught up.</p>
    </div>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();

  const { data: unreadData } = useUnreadCount();
  const { data: notifications = [], realtimeOffline } = useNotifications();
  const { mutate: markAllRead } = useMarkAllRead();

  const unreadCount = unreadData?.count ?? 0;
  const tooltipText = realtimeOffline
    ? "Live updates offline — refreshing every 60s"
    : `Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`;

  function handleNotificationNavigate(actionUrl) {
    setOpen(false);
    navigate(actionUrl);
  }

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      const inPanel = panelRef.current?.contains(e.target);
      const onButton = buttonRef.current?.contains(e.target);
      if (!inPanel && !onButton) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="icon"
        aria-label={tooltipText}
        title={tooltipText}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="relative h-8 w-8 text-text-2 hover:bg-surface-2 hover:text-text-1"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        <UnreadIndicator unreadCount={unreadCount} />
      </Button>

      {open && (
        <div
          ref={panelRef}
          data-testid="notification-panel"
          className="absolute right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border-1 bg-surface-0 shadow-[var(--shadow-popover)] motion-reduce:animate-none animate-in fade-in-0 slide-in-from-top-2 duration-[180ms]"
          style={{
            width: `${NOTIFICATION_PANEL_WIDTH_PX}px`,
            maxHeight: `${NOTIFICATION_PANEL_MAX_HEIGHT_PX}px`,
          }}
        >
          <div className="flex items-center justify-between border-b border-border-1 px-4 py-2.5">
            <h3 className="text-sm font-semibold text-text-1">
              Notifications {unreadCount > 0 ? `(${unreadCount} unread)` : ""}
            </h3>
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="link"
                onClick={() => markAllRead({}, {
                  onError: () => toast.error("Couldn't mark all read"),
                })}
                className="h-auto p-0 text-xs text-brand-600"
              >
                Mark all read
              </Button>
            )}
          </div>

          {notifications.length === 0 ? (
            <NotificationEmptyState />
          ) : (
            <ul
              className="overflow-y-auto"
              style={{ maxHeight: `${NOTIFICATION_PANEL_MAX_HEIGHT_PX - 44}px` }}
            >
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onNavigate={handleNotificationNavigate}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
