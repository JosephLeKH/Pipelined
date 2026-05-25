/** Draggable Kanban card — company, role, fit score, stale/follow-up footer (PRD-04 §8.2). */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Bell from "lucide-react/dist/esm/icons/bell";
import Clock from "lucide-react/dist/esm/icons/clock";
import { isStale, isFollowUpOverdue } from "../lib/dateUtils";
import { cn } from "../lib/utils";
import CompanyLogo from "./CompanyLogo";
import { getDisplayFitScore } from "../lib/fitDisplay";

function KanbanCardFooter({ stale, followUpOverdue }) {
  if (!stale && !followUpOverdue) return null;

  return (
    <div className="mt-2 flex items-center gap-2 text-[11px] text-text-3">
      {stale && (
        <>
          <Clock className="h-3.5 w-3.5 text-warning" data-testid="stale-indicator" aria-hidden="true" />
          <span className="sr-only">Stale application: no updates in 14+ days</span>
        </>
      )}
      {followUpOverdue && (
        <Bell
          className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400"
          data-testid="follow-up-indicator"
          aria-label="Follow-up overdue"
        />
      )}
    </div>
  );
}

function KanbanCard({ application, onSelect }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: application.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const stale = isStale(application.updated_at);
  const followUpOverdue = isFollowUpOverdue(application.follow_up_date);
  const fitScore = getDisplayFitScore(application);
  const dndKeyDown = listeners?.onKeyDown;

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(application)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(application);
        }
        dndKeyDown?.(e);
      }}
      data-testid="kanban-card"
      className={cn(
        "cursor-grab rounded-lg border border-border-1 bg-surface-0 p-3",
        "motion-reduce:transition-none transition-colors duration-150 hover:border-border-2",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-start gap-2">
        <CompanyLogo
          company_domain={application.company_domain ?? null}
          company={application.company ?? ""}
          size={20}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-1">{application.company}</p>
          <p className="mt-0.5 truncate text-xs text-text-2">{application.role_title}</p>
        </div>
        {fitScore != null && (
          <span className="shrink-0 text-xs text-text-3" data-testid="fit-badge">
            {fitScore}%
          </span>
        )}
      </div>
      <KanbanCardFooter stale={stale} followUpOverdue={followUpOverdue} />
    </article>
  );
}

export default KanbanCard;
