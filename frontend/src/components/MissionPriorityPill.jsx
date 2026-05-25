/** Inline priority pill for top-ranked missions — subtle surface badge. */

import {
  getMissionUrgencyTier,
  MISSION_URGENCY_LABELS,
} from "../lib/briefConstants";

const TOP_PRIORITY_MAX = 3;

function MissionPriorityPill({ priority }) {
  if (priority > TOP_PRIORITY_MAX) return null;

  const tier = getMissionUrgencyTier(priority);
  const label = MISSION_URGENCY_LABELS[tier];
  if (!label) return null;

  return (
    <span className="rounded-sm bg-surface-1 px-1.5 py-0.5 text-[11px] text-text-2">
      {label}
    </span>
  );
}

export default MissionPriorityPill;
