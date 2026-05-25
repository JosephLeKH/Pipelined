/** Single-line mission row with priority dot, hover actions, and row navigation. */

import { Link, useNavigate } from "react-router-dom";

import Check from "lucide-react/dist/esm/icons/check";
import Clock from "lucide-react/dist/esm/icons/clock";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";

import MissionPriorityPill from "./MissionPriorityPill";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  getMissionUrgencyTier,
  MISSION_PRIORITY_DOT_CLASSES,
  parseDeadlineLabel,
} from "../lib/briefConstants";

function MissionRowMenu({ actionUrl, onSnooze }) {
  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Mission actions"
            className="h-7 w-7 rounded text-text-2"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem asChild>
            <Link to={actionUrl}>Open</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSnooze}>Snooze</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MissionSubtitle({ mission, dueLabel }) {
  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-text-3">
      <span>{mission.reason}</span>
      <MissionPriorityPill priority={mission.priority} />
      {dueLabel && <span>· {dueLabel}</span>}
    </p>
  );
}

function MissionCard({
  mission,
  onSnooze,
  onDone,
  isSnoozing,
  isCompleting,
  completed = false,
}) {
  const navigate = useNavigate();
  const tier = getMissionUrgencyTier(mission.priority);
  const dotClass = MISSION_PRIORITY_DOT_CLASSES[tier];
  const dueLabel = mission.section === "oa_deadlines"
    ? parseDeadlineLabel(mission.body)?.label
    : null;
  const busy = isSnoozing || isCompleting;

  const handleRowClick = (event) => {
    if (event.target.closest("button, a, [role='menu']")) return;
    navigate(mission.action_url);
  };

  const handleRowKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      navigate(mission.action_url);
    }
  };

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      aria-label={mission.title}
      className={[
        "group flex items-center gap-3 border-b border-border-1 px-3 py-3",
        "hover:bg-surface-1 focus-visible:outline focus-visible:outline-2",
        "focus-visible:outline-brand-600 focus-visible:outline-offset-[-2px]",
        "dark:focus-visible:outline-1",
        "motion-safe:transition-colors motion-safe:duration-hover",
        completed ? "opacity-50" : "",
      ].join(" ")}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className={`text-sm text-text-1 ${completed ? "line-through text-text-3" : ""}`}>
          {mission.title}
        </p>
        {!completed && <MissionSubtitle mission={mission} dueLabel={dueLabel} />}
      </div>
      {!completed && (
        <div
          className={[
            "flex items-center gap-1",
            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
            "motion-safe:transition-opacity motion-safe:duration-hover",
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Complete"
            disabled={busy}
            onClick={() => onDone(mission.id)}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Snooze"
            disabled={busy}
            onClick={() => onSnooze(mission.id)}
          >
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <MissionRowMenu
            actionUrl={mission.action_url}
            onSnooze={() => onSnooze(mission.id)}
          />
        </div>
      )}
    </li>
  );
}

export default MissionCard;
