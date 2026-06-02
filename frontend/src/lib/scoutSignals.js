/** Pure resolver: returns the single highest-priority Scout signal for a row, or null. */

const TERMINAL_STAGES = new Set(["Rejected", "Withdrawn", "Offer", "Accepted"]);
const GHOST_DAYS = 10;
const REPLY_DAYS = 2;
const HIGH_FIT_THRESHOLD = 85;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(a, b) {
  return Math.floor((a - b) / MS_PER_DAY);
}

function replySignal(app, events, now) {
  if (app.follow_up_date) {
    const followUp = new Date(app.follow_up_date).getTime();
    if (followUp < now.getTime()) {
      const overdue = daysBetween(now, new Date(followUp));
      return {
        type: "reply",
        icon: "🔥",
        label: `Reply needed (${overdue}d)`,
        tooltip: `Follow-up overdue by ${overdue} day${overdue === 1 ? "" : "s"}`,
        action: "scout-take",
      };
    }
  }
  const inboundDates = events
    .filter((e) => e.direction === "inbound")
    .map((e) => new Date(e.occurred_at).getTime());
  const outboundDates = events
    .filter((e) => e.direction === "outbound")
    .map((e) => new Date(e.occurred_at).getTime());
  if (inboundDates.length === 0) return null;
  const lastIn = Math.max(...inboundDates);
  const lastOut = outboundDates.length ? Math.max(...outboundDates) : 0;
  if (lastIn <= lastOut) return null;
  const days = daysBetween(now, new Date(lastIn));
  if (days <= REPLY_DAYS) return null;
  return {
    type: "reply",
    icon: "🔥",
    label: `Reply needed (${days}d)`,
    tooltip: `Inbound email ${days} days ago, no reply`,
    action: "scout-take",
  };
}

function ghostSignal(app, now) {
  if (TERMINAL_STAGES.has(app.current_stage)) return null;
  if (!app.updated_at) return null;
  const days = daysBetween(now, new Date(app.updated_at));
  if (days <= GHOST_DAYS) return null;
  return {
    type: "ghost",
    icon: "👻",
    label: `Ghost risk (${days}d)`,
    tooltip: `No movement in ${days} days`,
    action: "scout-take",
  };
}

function foundSignal(app) {
  const isFound = app.source === "autopilot" || app.source === "watchlist";
  if (!isFound || app.viewed_at) return null;
  return {
    type: "found",
    icon: "✨",
    label: "Scout found this",
    tooltip: `Scout queued this from ${app.source}`,
    action: "scout-take",
  };
}

function highFitSignal(app) {
  if (typeof app.fit_score !== "number") return null;
  if (app.fit_score < HIGH_FIT_THRESHOLD) return null;
  if (app.viewed_at) return null;
  return {
    type: "high_fit",
    icon: "🎯",
    label: `High fit (${app.fit_score})`,
    tooltip: `Scout scored this ${app.fit_score}/100`,
    action: "scout-take",
  };
}

function toolsReadySignal(app) {
  const hasPack = Boolean(app.apply_pack);
  const hasPrep = Boolean(app.interview_prep_briefing);
  if (!hasPack && !hasPrep) return null;
  if (app.viewed_at) return null;
  return {
    type: "tools_ready",
    icon: "✓",
    label: "Tools ready",
    tooltip: "Scout has Apply Pack or Interview Prep ready",
    action: "scout-toolkit",
  };
}

export function computeScoutSignal(application, emailEvents = [], options = {}) {
  const now = options.now ?? new Date();
  return (
    replySignal(application, emailEvents, now) ??
    ghostSignal(application, now) ??
    foundSignal(application) ??
    highFitSignal(application) ??
    toolsReadySignal(application) ??
    null
  );
}
