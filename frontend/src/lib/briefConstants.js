/** Morning brief section ordering, display labels, and styling tokens. */

export const DEFAULT_MORNING_BRIEF_HOUR = 8;

export const BRIEF_SECTION_ORDER = [
  { key: "follow_ups", label: "Follow-ups" },
  { key: "interviews", label: "Interviews" },
  { key: "high_matches", label: "High matches" },
  { key: "pending_approvals", label: "Pending approvals" },
];

/** Left-border accent classes per section — follow-ups amber, interviews blue, pending brand. */
export const BRIEF_SECTION_ACCENTS = {
  follow_ups: "border-l-amber-500",
  interviews: "border-l-blue-500",
  oa_deadlines: "border-l-rose-500",
  high_matches: "border-l-emerald-500",
  pending_approvals: "border-l-brand-500",
};

/** Human-readable labels for mission section keys. */
export const MISSION_SECTION_LABELS = {
  follow_ups: "Follow-up",
  interviews: "Interview",
  oa_deadlines: "OA deadline",
  high_matches: "High match",
  pending_approvals: "Autopilot match",
};

/** Priority pill styles keyed by mission section — clay brand palette accents. */
export const MISSION_PRIORITY_PILL_STYLES = {
  follow_ups: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50",
  interviews: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50",
  oa_deadlines: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700/50",
  high_matches: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50",
  pending_approvals: "bg-brand-50 text-brand-800 border-brand-200 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-800/50",
};

export const MISSION_HERO_PRIORITY = 1;

/** Urgency tier from mission rank — top rank is most urgent. */
export function getMissionUrgencyTier(priority) {
  if (priority <= 1) return "urgent";
  if (priority === 2) return "high";
  if (priority === 3) return "medium";
  return "low";
}

/** Priority dot background classes keyed by urgency tier. */
export const MISSION_PRIORITY_DOT_CLASSES = {
  urgent: "bg-brand-600",
  high: "bg-status-orange",
  medium: "bg-status-warn",
  low: "bg-status-neutral",
};

/** Inline pill labels for top-three mission ranks. */
export const MISSION_URGENCY_LABELS = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
};

export const BRIEF_UNAVAILABLE_MESSAGE = "Brief not available right now — try again later";

const SCORE_PATTERN = /(?:Match|Fit) score (\d+)/;

/** Format hour (0–23) for user-facing copy, e.g. 8 → "8am", 14 → "2pm". */
export function formatBriefHour(hour) {
  const h = hour ?? DEFAULT_MORNING_BRIEF_HOUR;
  const period = h >= 12 ? "pm" : "am";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${period}`;
}

/** Empty-state copy using the user's configured brief delivery hour. */
export function getBriefEmptyMessage(hour) {
  return `Your brief generates at ${formatBriefHour(hour)} — check back soon`;
}

/** Extract fit/match score from brief item body when present. */
export function parseBriefItemScore(body) {
  if (!body) return null;
  const match = body.match(SCORE_PATTERN);
  return match ? Number(match[1]) : null;
}

const OVERDUE_PATTERN = /^Overdue by (\d+) day/;
const DUE_TODAY_PATTERN = /^Due today$/;
const DUE_IN_PATTERN = /^Due in (\d+) day/;

/** Parse OA deadline label and urgency from brief item body. */
export function parseDeadlineLabel(body) {
  if (!body) return null;
  if (DUE_TODAY_PATTERN.test(body)) {
    return { label: "Due today", tone: "urgent" };
  }
  const overdue = body.match(OVERDUE_PATTERN);
  if (overdue) {
    const days = Number(overdue[1]);
    const dayWord = days === 1 ? "day" : "days";
    return { label: `Overdue ${days} ${dayWord}`, tone: "overdue" };
  }
  const dueIn = body.match(DUE_IN_PATTERN);
  if (dueIn) {
    const days = Number(dueIn[1]);
    const dayWord = days === 1 ? "day" : "days";
    return { label: `Due in ${days} ${dayWord}`, tone: days <= 2 ? "urgent" : "soon" };
  }
  return null;
}
