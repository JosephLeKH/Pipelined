/** Bell icon with unread badge and dropdown notification panel. */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Bell from "lucide-react/dist/esm/icons/bell";
import BookOpen from "lucide-react/dist/esm/icons/book-open";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import Clock from "lucide-react/dist/esm/icons/clock";
import Sun from "lucide-react/dist/esm/icons/sun";

import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from "../hooks/useNotifications";
import { Button } from "./ui/button";

const MAX_BADGE_COUNT = 99;
const TYPE_ICONS = {
  stale_app: Clock,
  interview_tomorrow: CalendarClock,
  follow_up_due: Bell,
  morning_brief_ready: Sun,
  interview_prep_ready: BookOpen,
};

function NotificationItem({ notification, onNavigate }) {
  const { mutate: markRead } = useMarkRead();
  const Icon = TYPE_ICONS[notification.type] ?? Bell;

  function handleClick() {
    if (!notification.read) {
      markRead(notification.id);
    }
    if (notification.action_url) {
      onNavigate(notification.action_url);
    }
  }

  return (
    <li className={notification.read ? "opacity-60" : ""}>
      <Button
        type="button"
        variant="ghost"
        onClick={handleClick}
        className="flex w-full items-start gap-3 px-4 py-3 text-left h-auto rounded-none justify-start focus-visible:ring-inset"
      >
        <Icon
          className={`mt-0.5 h-4 w-4 shrink-0 ${
            notification.read ? "text-muted-foreground" : "text-foreground"
          }`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {notification.title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {notification.body}
          </p>
        </div>
        {!notification.read && (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
        )}
      </Button>
    </li>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();

  const { data: unreadData } = useUnreadCount();
  const { data: notifications = [] } = useNotifications();
  const { mutate: markAllRead } = useMarkAllRead();

  const unreadCount = unreadData?.count ?? 0;
  const badgeLabel = unreadCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(unreadCount);

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
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="relative text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-destructive-foreground"
          >
            {badgeLabel}
          </span>
        )}
      </Button>

      {open && (
        <div
          ref={panelRef}
          data-testid="notification-panel"
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-card border border-border bg-card shadow-card"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h3 className=" text-sm font-semibold text-foreground">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="link"
                onClick={() => markAllRead()}
                className="h-auto p-0 text-xs"
              >
                Mark all read
              </Button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No notifications
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onNavigate={handleNotificationNavigate} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
