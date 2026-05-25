/** Colored priority pill for mission cards — section-aware clay palette. */

import {
  MISSION_PRIORITY_PILL_STYLES,
  MISSION_SECTION_LABELS,
} from "../lib/briefConstants";
import { BADGE_BASE } from "../lib/designTokens";

function MissionPriorityPill({ priority, section }) {
  const sectionLabel = MISSION_SECTION_LABELS[section] ?? "Mission";
  const colorClass = MISSION_PRIORITY_PILL_STYLES[section]
    ?? "bg-surface-1 text-muted-foreground border-border-1";

  return (
    <span className={`${BADGE_BASE} border ${colorClass}`}>
      #{priority} · {sectionLabel}
    </span>
  );
}

export default MissionPriorityPill;
