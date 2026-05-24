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
  parseDeadlineLabel,
} from "../lib/briefConstants";
import { BADGE_BASE, BUTTON_GHOST, BUTTON_SECONDARY } from "../lib/designTokens";

const FIT_BADGE_SECTIONS = new Set(["high_matches", "pending_approvals"]);

const DEADLINE_TONE_STYLES = {
  overdue: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700/50",
  urgent: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50",
  soon: "bg-surface-secondary text-muted-foreground border-border-default",
};

function DeadlineBadge({ body }) {
  const parsed = parseDeadlineLabel(body);
  if (!parsed) return null;
  return (
    <span className={`${BADGE_BASE} border ${DEADLINE_TONE_STYLES[parsed.tone]}`}>
      {parsed.label}
    </span>
  );
}

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
      {mission.section === "oa_deadlines" && <DeadlineBadge body={mission.body} />}
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
