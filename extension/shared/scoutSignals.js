/** Pure resolver: returns the single highest-priority Scout signal for a
 * cached save, or null. Mirrors frontend/src/lib/scoutSignals.js but is
 * scoped to the fields available in the extension's recent_saves cache. */

const TERMINAL_STAGES = new Set(["Rejected", "Withdrawn", "Offer", "Accepted"]);
const GHOST_DAYS = 10;
const HIGH_FIT_THRESHOLD = 85;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(a, b) {
  return Math.floor((a - b) / MS_PER_DAY);
}

function ghostSignal(app, now) {
  if (TERMINAL_STAGES.has(app.stage)) return null;
  if (!app.updated_at) return null;
  const days = daysBetween(now, new Date(app.updated_at));
  if (days <= GHOST_DAYS) return null;
  return { type: "ghost", label: `Ghost risk (${days}d)` };
}

function highFitSignal(app) {
  if (typeof app.fit_score !== "number") return null;
  if (app.fit_score < HIGH_FIT_THRESHOLD) return null;
  if (app.viewed_at) return null;
  return { type: "high_fit", label: `High fit (${app.fit_score})` };
}

function toolsReadySignal(app) {
  if (!app.apply_pack_ready && !app.interview_prep_ready) return null;
  if (app.viewed_at) return null;
  return { type: "tools_ready", label: "Tools ready" };
}

/**
 * Resolve a Scout signal for a cached recent_saves entry.
 * @param {object} app
 * @param {{ now?: Date }} [options]
 * @returns {{ type: string, label: string }|null}
 */
export function computeScoutSignal(app, options = {}) {
  const now = options.now ?? new Date();
  return (
    ghostSignal(app, now) ??
    highFitSignal(app) ??
    toolsReadySignal(app) ??
    null
  );
}
