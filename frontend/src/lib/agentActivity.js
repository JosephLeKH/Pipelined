/** Agent activity timeline labels, dot colors, grouping, and navigation. */

const DATE_LABEL_TODAY = "Today";
const DATE_LABEL_YESTERDAY = "Yesterday";

export const AGENT_TYPE_LABELS = {
  prep: "Interview prep",
  fit: "Fit score",
  autopilot: "Autopilot",
  classify: "Gmail sync",
  brief: "Morning brief",
  review: "Weekly review",
  follow_up: "Follow-up draft",
};

/** PRD §6 agent dot colors — 8 px dots only. */
export const AGENT_DOT_COLORS = {
  autopilot: "#8C1515",
  brief: "#F59E0B",
  classify: "#3B82F6",
  review: "#175E54",
};

export const AGENT_DOT_COLOR_DEFAULT = "#71717A";

export const AGENT_STATUS_STYLES = {
  success: "text-status-success",
  failed: "text-destructive",
  skipped: "text-text-3",
};

export function agentTypeLabel(agentType) {
  return AGENT_TYPE_LABELS[agentType] ?? agentType.replace(/_/g, " ");
}

export function getAgentDotColor(agentType) {
  return AGENT_DOT_COLORS[agentType] ?? AGENT_DOT_COLOR_DEFAULT;
}

// Server datetimes are always UTC, but legacy responses may omit the timezone
// suffix. JS's Date constructor parses unsuffixed ISO 8601 as local time, which
// would shift display by the user's offset. Force-interpret as UTC if needed.
const TIMEZONE_SUFFIX_RE = /(Z|[+-]\d{2}:?\d{2})$/;

function parseServerTimestamp(timestamp) {
  if (!timestamp) return null;
  const hasTz = typeof timestamp === "string" && TIMEZONE_SUFFIX_RE.test(timestamp);
  return new Date(hasTz ? timestamp : `${timestamp}Z`);
}

function toDateKey(timestamp) {
  const d =
    timestamp instanceof Date || typeof timestamp === "number"
      ? new Date(timestamp)
      : parseServerTimestamp(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDateLabel(dateKey) {
  const todayKey = toDateKey(Date.now());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);
  if (dateKey === todayKey) return DATE_LABEL_TODAY;
  if (dateKey === yesterdayKey) return DATE_LABEL_YESTERDAY;
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function groupAgentEntriesByDate(entries) {
  const groups = [];
  const seen = new Map();
  for (const entry of entries) {
    const key = toDateKey(entry.created_at);
    if (!seen.has(key)) {
      const group = { dateKey: key, label: getDateLabel(key), entries: [] };
      seen.set(key, group);
      groups.push(group);
    }
    seen.get(key).entries.push(entry);
  }
  return groups;
}

export function formatActivityTimestamp(isoString) {
  const ts = parseServerTimestamp(isoString);
  if (!ts) return "";
  return ts.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function getAgentActivityHref(entry) {
  if (entry.application_id) {
    return `/applications/${entry.application_id}`;
  }
  if (entry.agent_type === "autopilot") return "/inbox/pending";
  if (entry.agent_type === "brief" || entry.agent_type === "review") return "/today";
  return null;
}
