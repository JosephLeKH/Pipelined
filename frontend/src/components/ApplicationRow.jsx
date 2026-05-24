/** Application row and stage pill — extracted from ApplicationList for the virtualized list. */

import Archive from "lucide-react/dist/esm/icons/archive";
import Bell from "lucide-react/dist/esm/icons/bell";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import Globe from "lucide-react/dist/esm/icons/globe";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard";
import Mail from "lucide-react/dist/esm/icons/mail";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";

import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { Button } from "./ui/button";
import { formatDate, isStale, isFollowUpOverdue } from "../lib/dateUtils";
import { useSwipeAction } from "../hooks/useSwipeAction";
import { RowMenu } from "./ApplicationRowActions";
import CompanyLogo from "./CompanyLogo";
import FitBadge from "./FitBadge";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { Checkbox } from "./ui/checkbox";

const SOURCE_ICONS = {
  extension: Globe,
  board: LayoutDashboard,
  manual: Pencil,
  email: Mail,
};


export function StagePill({ stage }) {
  const color = STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR;
  return (
    <span
      aria-label={stage}
      className={`rounded-full text-xs font-medium px-2.5 py-1 inline-flex items-center gap-1.5 ${color.bg} ${color.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
      {stage}
    </span>
  );
}

function SwipeActions({ onArchive, onFollowUp, revealed }) {
  return (
    <div
      className={`absolute inset-y-0 right-0 flex transition-opacity duration-150 ${revealed ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      aria-hidden={!revealed}
    >
      <Button
        type="button"
        variant="ghost"
        aria-label="Set follow-up"
        onClick={onFollowUp}
        className="h-full w-20 flex-col gap-1 rounded-none bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 active:bg-amber-700"
      >
        <CalendarClock className="h-5 w-5" aria-hidden="true" />
        Follow-up
      </Button>
      <Button
        type="button"
        variant="ghost"
        aria-label="Archive application"
        onClick={onArchive}
        className="h-full w-20 flex-col gap-1 rounded-none bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 active:bg-destructive/80"
      >
        <Archive className="h-5 w-5" aria-hidden="true" />
        Archive
      </Button>
    </div>
  );
}

function ApplicationRow({
  application, onSelect, style, onArchive, onUnarchive, onDelete, onSetFollowUp,
  checked, onToggle, hasSelection, isFocused = false,
}) {
  const SourceIcon = SOURCE_ICONS[application.source] ?? Pencil;
  const stale = isStale(application.updated_at);
  const followUpOverdue = isFollowUpOverdue(application.follow_up_date);
  const dateApplied = formatDate(application.date_applied);
  const archived = Boolean(application.archived);
  const checkboxVisible = hasSelection ? "opacity-100" : "opacity-0 group-hover:opacity-100";

  const { offset, revealed, handlers, handleAction } = useSwipeAction();

  return (
    <div
      style={style}
      className="relative overflow-hidden"
      data-testid="application-row-wrapper"
    >
      <SwipeActions
        revealed={revealed}
        onArchive={() => handleAction(() => onArchive(application.id))}
        onFollowUp={() => handleAction(() => onSetFollowUp?.(application.id))}
      />
      <div
        className={`group flex cursor-pointer items-center gap-4 border-b border-border px-4 py-4 hover:bg-muted/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${archived ? "opacity-60" : ""} ${isFocused ? "border-l-2 border-l-primary bg-primary/5" : ""}`}
        style={{ transform: offset !== 0 ? `translateX(${offset}px)` : undefined, transition: offset !== 0 ? "none" : undefined }}
        onClick={() => onSelect(application)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(application); }}
        tabIndex={0}
        {...handlers}
      >
        <span className={`shrink-0 transition-opacity ${checkboxVisible}`} onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={checked}
            onCheckedChange={() => onToggle(application.id)}
            aria-label={`Select ${application.company}`}
          />
        </span>
        <span className="relative w-2 shrink-0">
          {stale && !archived && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  className="block h-2 w-2 animate-pulse rounded-full bg-amber-400 dark:bg-amber-900/40 cursor-default"
                  data-testid="stale-indicator"
                  aria-label="Stale application — no updates in 14+ days"
                />
              </TooltipTrigger>
              <TooltipContent>No updates in 14 days — consider following up</TooltipContent>
            </Tooltip>
          )}
        </span>
        <CompanyLogo company_domain={application.company_domain ?? null} company={application.company ?? ""} size={24} />
        <span className={`w-36 truncate font-medium ${archived ? "text-muted-foreground line-through" : "text-foreground"}`}>
          {application.company}
        </span>
        <span className={`flex-1 truncate text-sm ${archived ? "text-muted-foreground" : "text-muted-foreground"}`}>
          {application.role_title}
        </span>
        <StagePill stage={application.current_stage} />
        <span className="w-5 shrink-0 inline-flex items-center justify-center">
          {application.interview_prep_briefing && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-flex cursor-default">
                  <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Interview prep ready</TooltipContent>
            </Tooltip>
          )}
        </span>
        <FitBadge score={application.ai_analysis?.fit_score ?? null} />
        <span className="relative w-4 shrink-0">
          {followUpOverdue && !archived && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Bell className="h-4 w-4 text-amber-500 dark:text-amber-400 cursor-default" data-testid="follow-up-bell" aria-label={`Follow-up due ${formatDate(application.follow_up_date)}`} />
              </TooltipTrigger>
              <TooltipContent>Follow-up due {formatDate(application.follow_up_date)}</TooltipContent>
            </Tooltip>
          )}
        </span>
        <span className="w-28 text-sm text-muted-foreground">{dateApplied}</span>
        {application.source === "email" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Mail className="h-4 w-4 shrink-0 text-primary cursor-default" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>Auto-tracked from Gmail</TooltipContent>
          </Tooltip>
        ) : (
          <SourceIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
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
