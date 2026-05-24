/** Pure helpers for autopilot scan scheduling display. */

import { AUTOPILOT_SCAN_HOUR_UTC } from "./constants";
import { formatDateTime } from "./dateUtils";

/** Return the next daily autopilot scan as a UTC Date. */
export function getNextAutopilotScanDate() {
  const now = new Date();
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      AUTOPILOT_SCAN_HOUR_UTC,
      0,
      0,
      0
    )
  );
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

/** Human-readable next scan time in the user's timezone. */
export function formatNextScanPreview(timezone) {
  return formatDateTime(getNextAutopilotScanDate().toISOString(), timezone);
}
