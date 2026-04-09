/** Centralised date formatting utilities for consistent display across the app. */

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

/** Format an ISO string as "Apr 7, 2026 at 3:00 PM". */
export function formatDateTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const datePart = date.toLocaleDateString(LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: TIMEZONE,
  });
  const timePart = date.toLocaleTimeString(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIMEZONE,
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
