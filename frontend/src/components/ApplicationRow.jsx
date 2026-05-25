/** Application row and stage pill — extracted from ApplicationList for the virtualized list. */

import Archive from "lucide-react/dist/esm/icons/archive";
import Bell from "lucide-react/dist/esm/icons/bell";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import Clock from "lucide-react/dist/esm/icons/clock";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import { differenceInDays } from "date-fns/differenceInDays";

import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { Button } from "./ui/button";
import { formatDate, isStale, isFollowUpOverdue } from "../lib/dateUtils";
import { useSwipeAction } from "../hooks/useSwipeAction";
import { RowMenu, RowQuickActions } from "./ApplicationRowActions";
import CompanyLogo from "./CompanyLogo";
import FitBadge from "./FitBadge";
import { getDisplayFitScore } from "../lib/fitDisplay";
import { FIT_SCORE_LABEL } from "../lib/aiConstants";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { Checkbox } from "./ui/checkbox";

const STALE_DAYS = 14;
const TERMINAL_STAGES = ["Offer", "Rejected"];
const MUTED_STAGE_LABELS = new Set(["Rejected", "Withdrawn"]);

export function StagePill({ stage }) {
  const color = STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR;
  const muted = MUTED_STAGE_LABELS.has(stage);
  return (
    <span
      data-testid="stage-pill"
      className={`inline-flex shrink-0 items-center gap-1.5 text-xs text-text-1 ${muted ? "line-through" : ""}`}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color.dotColor }}
        aria-hidden="true"
      />
      {stage}
    </span>
  );
}

function rowClassName({ archived, isFocused, isSelected }) {
  const classes = [
    "group flex h-14 cursor-pointer items-center gap-3 border-b border-border-1 px-4 md:h-10",
    "hover:bg-surface-1 motion-reduce:transition-none transition-colors duration-[120ms] ease-out",
    "focus:outline-none focus-visible:border-l-2 focus-visible:border-l-brand-600",
  ];
  if (archived) classes.push("opacity-60");
  if (isFocused || isSelected) {
    classes.push("border-l-2 border-l-brand-600 bg-brand-50/40 dark:bg-brand-900/20");
  }
  return classes.join(" ");
}

function SwipeActions({ onArchive, onFollowUp, revealed }) {
  return (
    <div
      className={`absolute inset-y-0 right-0 flex md:hidden transition-opacity duration-150 motion-reduce:transition-none ${revealed ? "opacity-100" : "pointer-events-none opacity-0"}`}
      aria-hidden={!revealed}
      data-testid="row-swipe-actions"
    >
      <Button
        type="button"
        variant="ghost"
        aria-label="Set follow-up"
        onClick={onFollowUp}
        className="h-full w-20 flex-col gap-1 rounded-none bg-amber-500 text-xs font-medium text-white hover:bg-amber-600 active:bg-amber-700"
      >
        <CalendarClock className="h-5 w-5" aria-hidden="true" />
        Follow-up
      </Button>
      <Button
        type="button"
        variant="ghost"
        aria-label="Archive application"
        onClick={onArchive}
        className="h-full w-20 flex-col gap-1 rounded-none bg-destructive text-xs font-medium text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80"
      >
        <Archive className="h-5 w-5" aria-hidden="true" />
        Archive
      </Button>
    </div>
  );
}

function ApplicationRow({
  application, onSelect, style, onArchive, onUnarchive, onDelete, onSetFollowUp,
  checked, onToggle, hasSelection, isFocused = false, isSelected = false,
}) {
  const stale = isStale(application.updated_at);
  const followUpOverdue = isFollowUpOverdue(application.follow_up_date);
  const dateApplied = formatDate(application.date_applied);
  const archived = Boolean(application.archived);
  const checkboxVisible = hasSelection ? "opacity-100" : "opacity-0 group-hover:opacity-100";

  const staleDays = application.updated_at
    ? differenceInDays(new Date(), new Date(application.updated_at))
    : 0;
  const isStaleIndicator = staleDays >= STALE_DAYS && !TERMINAL_STAGES.includes(application.current_stage);

  const { offset, revealed, handlers, handleAction } = useSwipeAction();
  const fitScore = getDisplayFitScore(application);

  return (
    <div style={style} className="relative overflow-hidden" data-testid="application-row-wrapper">
      <SwipeActions
        revealed={revealed}
        onArchive={() => handleAction(() => onArchive(application.id))}
        onFollowUp={() => handleAction(() => onSetFollowUp?.(application.id))}
      />
      <div
        role="listitem"
        aria-label={`${application.company}, ${application.role_title}, ${application.current_stage}`}
        className={rowClassName({ archived, isFocused, isSelected })}
        style={{
          transform: offset !== 0 ? `translateX(${offset}px)` : undefined,
          transition: offset !== 0 ? "none" : undefined,
        }}
        onClick={() => onSelect(application)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(application); }}
        tabIndex={0}
        {...handlers}
      >
        <span className={`w-4 shrink-0 transition-opacity ${checkboxVisible}`} onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={checked}
            onCheckedChange={() => onToggle(application.id)}
            aria-label={`Select ${application.company}`}
            className="h-4 w-4"
          />
        </span>
        <span className="relative w-2 shrink-0">
          {stale && !archived && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  role="img"
                  className="block h-2 w-2 animate-pulse cursor-default rounded-full bg-amber-400 motion-reduce:animate-none dark:bg-amber-500"
                  data-testid="stale-indicator"
                  aria-label="Stale application — no updates in 14+ days"
                />
              </TooltipTrigger>
              <TooltipContent>No updates in 14 days — consider following up</TooltipContent>
            </Tooltip>
          )}
        </span>
        <CompanyLogo
          company_domain={application.company_domain ?? null}
          company={application.company ?? ""}
          size={16}
        />
        <span className={`w-40 shrink-0 truncate text-[13px] font-medium ${archived ? "text-text-3 line-through" : "text-text-1"}`}>
          {application.company}
        </span>
        <span className={`min-w-0 flex-1 truncate text-[13px] ${archived ? "text-text-3" : "text-text-2"}`}>
          {application.role_title}
        </span>
        <StagePill stage={application.current_stage} />
        <span className="inline-flex w-4 shrink-0 items-center justify-center">
          {application.interview_prep_briefing && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-flex cursor-default">
                  <Sparkles className="h-4 w-4 text-brand-600" aria-hidden="true" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Interview prep briefing ready — open to review company research and talking points</TooltipContent>
            </Tooltip>
          )}
        </span>
        {fitScore != null ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="inline-flex w-11 shrink-0 cursor-default justify-end">
                <FitBadge score={fitScore} />
              </span>
            </TooltipTrigger>
            <TooltipContent>{FIT_SCORE_LABEL} based on your resume and the job description</TooltipContent>
          </Tooltip>
        ) : (
          <span className="w-11 shrink-0" />
        )}
        <span className="inline-flex w-4 shrink-0 items-center justify-center">
          {isStaleIndicator && !archived && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Clock className="h-4 w-4 cursor-default text-warning" data-testid="stale-clock" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>No update in {staleDays} days</TooltipContent>
            </Tooltip>
          )}
        </span>
        <span className="inline-flex w-4 shrink-0 items-center justify-center">
          {followUpOverdue && !archived && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Bell
                  className="h-4 w-4 cursor-default text-amber-500 dark:text-amber-400"
                  data-testid="follow-up-bell"
                  aria-label={`Follow-up due ${formatDate(application.follow_up_date)}`}
                />
              </TooltipTrigger>
              <TooltipContent>Follow-up due {formatDate(application.follow_up_date)}</TooltipContent>
            </Tooltip>
          )}
        </span>
        <span className="w-20 shrink-0 text-xs text-text-3">{dateApplied}</span>
        <RowQuickActions
          archived={archived}
          onArchive={() => onArchive(application.id)}
          onFollowUp={() => onSetFollowUp?.(application.id)}
        />
        <RowMenu
          application={application}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

export default ApplicationRow;
