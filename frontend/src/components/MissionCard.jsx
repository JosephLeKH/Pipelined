/** Single prioritized mission card with reason, CTA, snooze, and done actions. */

import { Link } from "react-router-dom";

import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Check from "lucide-react/dist/esm/icons/check";
import Clock from "lucide-react/dist/esm/icons/clock";
import Target from "lucide-react/dist/esm/icons/target";

import AiSection from "./AiSection";
import FitBadge from "./FitBadge";
import MissionPriorityPill from "./MissionPriorityPill";
import { Button } from "./ui/button";
import {
  BRIEF_SECTION_ACCENTS,
  parseBriefItemScore,
} from "../lib/briefConstants";
import { BUTTON_GHOST, BUTTON_SECONDARY } from "../lib/designTokens";

const FIT_BADGE_SECTIONS = new Set(["high_matches", "pending_approvals"]);

function MissionCard({ mission, onSnooze, onDone, isSnoozing, isCompleting }) {
  const accent = BRIEF_SECTION_ACCENTS[mission.section] ?? "border-l-brand-500";
  const fitScore = FIT_BADGE_SECTIONS.has(mission.section)
    ? parseBriefItemScore(mission.body)
    : null;
  const busy = isSnoozing || isCompleting;

  return (
    <AiSection
      title={mission.title}
      icon={Target}
      className={accent}
      headerExtra={
        <MissionPriorityPill priority={mission.priority} section={mission.section} />
      }
    >
      <p className="text-sm text-muted-foreground">{mission.reason}</p>
      {fitScore != null && <FitBadge score={fitScore} />}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button asChild size="sm">
          <Link to={mission.action_url} className="inline-flex items-center gap-1.5">
            Open
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
        <button
          type="button"
          onClick={() => onSnooze(mission.id)}
          disabled={busy}
          className={`${BUTTON_GHOST} inline-flex items-center gap-1.5 px-3 py-1.5 text-xs`}
        >
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Snooze
        </button>
        <button
          type="button"
          onClick={() => onDone(mission.id)}
          disabled={busy}
          className={`${BUTTON_SECONDARY} inline-flex items-center gap-1.5 px-3 py-1.5 text-xs`}
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Done
        </button>
      </div>
    </AiSection>
  );
}

export default MissionCard;
