/** Centralised date formatting utilities for consistent display across the app. */

import { STALE_APPLICATION_DAYS, STALE_CONTACT_DAYS, MS_PER_DAY } from "./constants";

const LOCALE = "en-US";
const TIMEZONE =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";

/**
 * Parse an ISO string to a Date, treating date-only strings (YYYY-MM-DD) as
 * local time to avoid timezone-offset shifts.
 */
function parseISOSafe(isoString) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
    const [y, m, d] = isoString.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(isoString);
}

/** Format an ISO string as "Apr 7" (no year) for compact displays. */
export function formatDateShort(isoString) {
  if (!isoString) return "";
  return parseISOSafe(isoString).toLocaleDateString(LOCALE, {
    month: "short",
    day: "numeric",
    timeZone: TIMEZONE,
  });
}

/** Format an ISO string as "Apr 7, 2026". */
export function formatDate(isoString) {
  if (!isoString) return "";
  return parseISOSafe(isoString).toLocaleDateString(LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: TIMEZONE,
  });
}

/** Format an HH:MM or HH:MM:SS time string as "H:MM AM/PM". */
export function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, min] = timeStr.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const displayHour = h % 12 || 12;
  return `${displayHour}:${String(min).padStart(2, "0")} ${ampm}`;
}

/** Format an ISO string as "Apr 7, 2026 at 3:00 PM" in the given timezone. */
export function formatDateTime(isoString, timezone) {
  if (!isoString) return "";
  const tz = timezone ?? TIMEZONE;
  const date = new Date(isoString);
  const datePart = date.toLocaleDateString(LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: tz,
  });
  const timePart = date.toLocaleTimeString(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
  return `${datePart} at ${timePart}`;
}

/**
 * Format an ISO string as a relative label ("Today", "Yesterday", "3 days ago")
 * for dates within the past 7 days, falling back to formatDate for older dates.
 */
export function formatRelative(isoString) {
  if (!isoString) return "";
  const date = parseISOSafe(isoString);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const diffDays = Math.round(
    (todayStart - targetStart) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 7) return `${diffDays} days ago`;
  return formatDate(isoString);
}

/**
 * Convert a Date object to an ISO date string (YYYY-MM-DD) using local time.
 * Used for calendar key generation and form date inputs.
 */
export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Format a Date object as a long accessible label, e.g.
 * "Wednesday, April 7, 2026". Used for aria-labels on calendar day cells.
 */
export function formatDateLong(date) {
  return date.toLocaleDateString(LOCALE, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Check if an application is stale (no updates within STALE_APPLICATION_DAYS).
 */
export function isStale(updatedAt) {
  return Date.now() - new Date(updatedAt).getTime() > STALE_APPLICATION_DAYS * MS_PER_DAY;
}

/**
 * Check if a follow-up is overdue (follow-up date is in the past).
 */
export function isFollowUpOverdue(followUpDate) {
  if (!followUpDate) return false;
  return new Date(followUpDate) < new Date(new Date().toDateString());
}

/**
 * Check if a contact is stale (no contact within STALE_CONTACT_DAYS).
 */
export function isStaleContact(lastContactedAt) {
  if (!lastContactedAt) return true;
  const diffDays = (Date.now() - new Date(lastContactedAt).getTime()) / MS_PER_DAY;
  return diffDays > STALE_CONTACT_DAYS;
}
