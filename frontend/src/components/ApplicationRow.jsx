/** Application row and stage pill — extracted from ApplicationList for the virtualized list. */

import Archive from "lucide-react/dist/esm/icons/archive";
import Bell from "lucide-react/dist/esm/icons/bell";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import Globe from "lucide-react/dist/esm/icons/globe";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard";
import Pencil from "lucide-react/dist/esm/icons/pencil";

import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { BADGE_BASE } from "../lib/designTokens";
import { formatDate, isStale, isFollowUpOverdue } from "../lib/dateUtils";
import { useSwipeAction } from "../hooks/useSwipeAction";
import { RowMenu } from "./ApplicationRowActions";
import CompanyLogo from "./CompanyLogo";
import FitBadge from "./FitBadge";

const SOURCE_ICONS = {
  extension: Globe,
  board: LayoutDashboard,
  manual: Pencil,
};

export function StagePill({ stage }) {
  const color = STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR;
  return (
    <span
      aria-label={stage}
      className={`${BADGE_BASE} gap-1.5 ${color.bg} ${color.text}`}
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
      <button
        type="button"
        aria-label="Set follow-up"
        className="flex w-20 flex-col items-center justify-center gap-1 bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 active:bg-amber-700"
        onClick={onFollowUp}
      >
        <CalendarClock className="h-5 w-5" aria-hidden="true" />
        Follow-up
      </button>
      <button
        type="button"
        aria-label="Archive application"
        className="flex w-20 flex-col items-center justify-center gap-1 bg-rose-500 text-white text-xs font-medium hover:bg-rose-600 active:bg-rose-700"
        onClick={onArchive}
      >
        <Archive className="h-5 w-5" aria-hidden="true" />
        Archive
      </button>
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
        className={`group flex cursor-pointer items-center gap-4 border-b border-gray-100 px-4 py-3.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 dark:border-gray-700 dark:hover:bg-gray-700 ${archived ? "opacity-60" : ""} ${isFocused ? "border-l-2 border-l-brand-500 bg-brand-50 dark:bg-brand-900/20" : ""}`}
        style={{ transform: offset !== 0 ? `translateX(${offset}px)` : undefined, transition: offset !== 0 ? "none" : undefined }}
        onClick={() => onSelect(application)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(application); }}
        role="row"
        tabIndex={0}
        {...handlers}
      >
        <span className={`shrink-0 transition-opacity ${checkboxVisible}`} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            aria-label={`Select ${application.company}`}
            checked={checked}
            onChange={() => onToggle(application.id)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600"
          />
        </span>
        <span className="relative w-2 shrink-0 group/stale">
          {stale && !archived && (
            <>
              <span
                className="block h-2 w-2 animate-pulse rounded-full bg-amber-400"
                data-testid="stale-indicator"
                aria-label="Stale application — no updates in 14+ days"
              />
              <span
                role="tooltip"
                className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 whitespace-nowrap rounded-button bg-gray-800 px-2 py-1 text-xs text-white opacity-0 group-hover/stale:opacity-100"
              >
                No updates in 14 days — consider following up
              </span>
            </>
          )}
        </span>
        <CompanyLogo company_domain={application.company_domain ?? null} company={application.company ?? ""} size={24} />
        <span className={`w-36 truncate font-medium ${archived ? "text-gray-400 line-through" : "text-gray-900 dark:text-gray-100"}`}>
          {application.company}
        </span>
        <span className={`flex-1 truncate text-sm ${archived ? "text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>
          {application.role_title}
        </span>
        <StagePill stage={application.current_stage} />
        <FitBadge score={application.ai_analysis?.fit_score ?? null} />
        <span className="relative w-4 shrink-0 group/followup">
          {followUpOverdue && !archived && (
            <>
              <Bell className="h-4 w-4 text-amber-500" data-testid="follow-up-bell" aria-label={`Follow-up due ${formatDate(application.follow_up_date)}`} />
              <span
                role="tooltip"
                className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 group-hover/followup:opacity-100"
              >
                Follow-up due {formatDate(application.follow_up_date)}
              </span>
            </>
          )}
        </span>
        <span className="w-28 text-sm text-gray-500 dark:text-gray-400">{dateApplied}</span>
        <SourceIcon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" aria-label={application.source} />
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
