/** Greeting and date formatting helpers for the Today page. */

import {
  COMPLETED_MISSIONS_BY_DATE_KEY,
  MORNING_BRIEF_EXPANDED_KEY,
} from "./constants";

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

/** Build Scout briefing heading line, e.g. "Scout's briefing for Jun 1". */
export function formatTodayGreeting(user, briefDate) {
  const date = briefDate ? new Date(`${briefDate}T12:00:00`) : new Date();
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  return `Scout's briefing for ${month} ${day}`;
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

/** Whether the given instant is Sunday in the user's timezone. */
export function isSundayInTimezone(timezone, now = new Date()) {
  const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const weekday = new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: tz })
    .formatToParts(now)
    .find((part) => part.type === "weekday")?.value;
  return weekday === "Sun";
}

/** Narrative copy for the Sunday weekly review teaser row. */
export function formatWeeklyReviewTeaser(review) {
  const applied = review?.velocity?.applied_this_week ?? 0;
  const appliedLabel = applied === 1 ? "1 application" : `${applied} applications`;
  return `You shipped ${appliedLabel} this week.`;
}

function readBriefExpandedMap() {
  try {
    const raw = localStorage.getItem(MORNING_BRIEF_EXPANDED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Whether the morning brief is expanded for a given brief date (defaults collapsed). */
export function getBriefExpandedForDate(briefDate) {
  if (!briefDate) return false;
  const map = readBriefExpandedMap();
  return map[briefDate] === true;
}

/** Persist morning brief expanded state keyed by brief date. */
export function setBriefExpandedForDate(briefDate, expanded) {
  if (!briefDate) return;
  const map = readBriefExpandedMap();
  map[briefDate] = expanded;
  localStorage.setItem(MORNING_BRIEF_EXPANDED_KEY, JSON.stringify(map));
}

function readCompletedMissionsMap() {
  try {
    const raw = localStorage.getItem(COMPLETED_MISSIONS_BY_DATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Completed mission snapshots stored per brief date for the bottom group. */
export function getStoredCompletedMissions(briefDate) {
  if (!briefDate) return [];
  const map = readCompletedMissionsMap();
  return Array.isArray(map[briefDate]) ? map[briefDate] : [];
}

/** Append a completed mission snapshot for a brief date; returns updated list. */
export function storeCompletedMission(briefDate, mission) {
  if (!briefDate || !mission?.id) return getStoredCompletedMissions(briefDate);
  const map = readCompletedMissionsMap();
  const existing = Array.isArray(map[briefDate]) ? map[briefDate] : [];
  if (existing.some((item) => item.id === mission.id)) {
    return existing;
  }
  const next = [...existing, { id: mission.id, title: mission.title, action_url: mission.action_url }];
  map[briefDate] = next;
  localStorage.setItem(COMPLETED_MISSIONS_BY_DATE_KEY, JSON.stringify(map));
  return next;
}
