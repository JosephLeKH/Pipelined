/** Greeting and date formatting helpers for the Today page. */

const LOCALE = "en-US";

/** Time-of-day bucket for greeting copy: morning / afternoon / evening. */
export function getTimeOfDay(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/** First name from display name or email local-part. */
export function getFirstName(user) {
  const displayName = user?.display_name?.trim();
  if (displayName) {
    return displayName.split(/\s+/)[0];
  }
  if (user?.email) {
    return user.email.split("@")[0];
  }
  return "there";
}

/** Build greeting line, e.g. "Good morning, Joseph." */
export function formatTodayGreeting(user, now = new Date()) {
  const timeOfDay = getTimeOfDay(now);
  const firstName = getFirstName(user);
  return `Good ${timeOfDay}, ${firstName}.`;
}

/** Build date row, e.g. "Wednesday, May 25 · 5 missions". */
export function formatTodayDateRow(briefDate, missionCount, timezone) {
  const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = briefDate ? new Date(`${briefDate}T12:00:00`) : new Date();
  const weekday = date.toLocaleDateString(LOCALE, { weekday: "long", timeZone: tz });
  const monthDay = date.toLocaleDateString(LOCALE, { month: "long", day: "numeric", timeZone: tz });
  const missionLabel = missionCount === 1 ? "1 mission" : `${missionCount} missions`;
  return `${weekday}, ${monthDay} · ${missionLabel}`;
}

/** Days remaining until end of calendar week (Sunday) in the user's timezone. */
export function getDaysLeftInWeek(now = new Date(), timezone) {
  const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const weekday = new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: tz })
    .formatToParts(now)
    .find((part) => part.type === "weekday")?.value;
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday ?? "Sun");
  if (dayIndex < 0) return 0;
  return dayIndex === 0 ? 0 : 7 - dayIndex;
}

/** Label for days left copy, e.g. "2 days left". */
export function formatDaysLeftInWeek(now = new Date(), timezone) {
  const daysLeft = getDaysLeftInWeek(now, timezone);
  if (daysLeft === 0) return "Last day of the week";
  if (daysLeft === 1) return "1 day left";
  return `${daysLeft} days left`;
}
