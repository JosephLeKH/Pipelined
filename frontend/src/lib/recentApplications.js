/** localStorage helpers for command palette recent application IDs. */

export const RECENT_APPLICATIONS_KEY = "pipelined_recent_applications";
export const RECENT_APPLICATIONS_MAX = 5;

/** Returns stored recent application IDs, newest first. */
export function getRecentApplicationIds() {
  try {
    const raw = localStorage.getItem(RECENT_APPLICATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** Prepends an application ID to the recent list, capped at RECENT_APPLICATIONS_MAX. */
export function recordRecentApplication(id) {
  if (!id) return;
  const next = [id, ...getRecentApplicationIds().filter((stored) => stored !== id)].slice(
    0,
    RECENT_APPLICATIONS_MAX,
  );
  localStorage.setItem(RECENT_APPLICATIONS_KEY, JSON.stringify(next));
}
