/** Application row and stage pill — extracted from ApplicationList for the virtualized list. */

import Globe from "lucide-react/dist/esm/icons/globe";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Bell from "lucide-react/dist/esm/icons/bell";

import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { BADGE_BASE } from "../lib/designTokens";
import { formatDate, isStale, isFollowUpOverdue } from "../lib/dateUtils";
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

function ApplicationRow({
  application, onSelect, style, onArchive, onUnarchive, onDelete,
  checked, onToggle, hasSelection, isFocused = false,
}) {
  const SourceIcon = SOURCE_ICONS[application.source] ?? Pencil;
  const stale = isStale(application.updated_at);
  const followUpOverdue = isFollowUpOverdue(application.follow_up_date);
  const dateApplied = formatDate(application.date_applied);
  const archived = Boolean(application.archived);
  const checkboxVisible = hasSelection ? "opacity-100" : "opacity-0 group-hover:opacity-100";

  return (
    <div
      style={style}
      className={`group flex cursor-pointer items-center gap-4 border-b border-slate-100 px-4 py-3.5 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 dark:border-slate-700 dark:hover:bg-slate-700 ${archived ? "opacity-60" : ""} ${isFocused ? "border-l-2 border-l-brand-500 bg-brand-50 dark:bg-brand-900/20" : ""}`}
      onClick={() => onSelect(application)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(application); }}
      role="row"
      tabIndex={0}
    >
      <span className={`shrink-0 transition-opacity ${checkboxVisible}`} onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          aria-label={`Select ${application.company}`}
          checked={checked}
          onChange={() => onToggle(application.id)}
          className="h-4 w-4 rounded border-slate-300 text-brand-600"
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
              className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 whitespace-nowrap rounded-button bg-slate-800 px-2 py-1 text-xs text-white opacity-0 group-hover/stale:opacity-100"
            >
              No updates in 14 days — consider following up
            </span>
          </>
        )}
      </span>
      <CompanyLogo company_domain={application.company_domain ?? null} company={application.company ?? ""} size={24} />
      <span className={`w-36 truncate font-medium ${archived ? "text-slate-400 line-through" : "text-slate-900 dark:text-slate-100"}`}>
        {application.company}
      </span>
      <span className={`flex-1 truncate text-sm ${archived ? "text-slate-400" : "text-slate-700 dark:text-slate-300"}`}>
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
      <span className="w-28 text-sm text-slate-500 dark:text-slate-400">{dateApplied}</span>
      <SourceIcon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-label={application.source} />
      <RowMenu
        application={application}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
        onDelete={onDelete}
      />
    </div>
  );
}

export default ApplicationRow;
