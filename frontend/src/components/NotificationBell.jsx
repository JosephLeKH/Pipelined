/** Bell icon with unread badge and dropdown notification panel. */

import { useEffect, useRef, useState } from "react";

import Bell from "lucide-react/dist/esm/icons/bell";
import BriefcaseBusiness from "lucide-react/dist/esm/icons/briefcase-business";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import Clock from "lucide-react/dist/esm/icons/clock";

import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from "../hooks/useNotifications";

const MAX_BADGE_COUNT = 99;
const TYPE_ICONS = {
  stale_app: BriefcaseBusiness,
  interview_tomorrow: CalendarClock,
  follow_up_due: Clock,
};

function NotificationItem({ notification }) {
  const { mutate: markRead } = useMarkRead();
  const Icon = TYPE_ICONS[notification.type] ?? Bell;

  function handleClick() {
    if (!notification.read) {
      markRead(notification.id);
    }
  }

  return (
    <li
      className={`flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors dark:hover:bg-gray-700/50 ${
        notification.read ? "opacity-60" : ""
      }`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 ${
          notification.read
            ? "text-gray-400 dark:text-gray-500"
            : "text-gray-600 dark:text-gray-400"
        }`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
          {notification.title}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {notification.body}
        </p>
      </div>
      {!notification.read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />
      )}
    </li>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  const { data: unreadData } = useUnreadCount();
  const { data: notifications = [] } = useNotifications();
  const { mutate: markAllRead } = useMarkAllRead();

  const unreadCount = unreadData?.count ?? 0;
  const badgeLabel = unreadCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(unreadCount);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          data-testid="notification-panel"
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-card border border-gray-200 bg-white shadow-card dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-xs text-brand-600 hover:underline dark:text-brand-400"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No notifications
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
