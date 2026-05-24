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
  high_matches: "border-l-emerald-500",
  pending_approvals: "border-l-brand-500",
};

/** Human-readable labels for mission section keys. */
export const MISSION_SECTION_LABELS = {
  follow_ups: "Follow-up",
  interviews: "Interview",
  high_matches: "High match",
  pending_approvals: "Autopilot match",
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
