/** Draggable Kanban card showing company, role, date applied, and stale indicator. */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import { formatRelative, isStale, isFollowUpOverdue } from "../lib/dateUtils";
import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { cn } from "../lib/utils";
import CompanyLogo from "./CompanyLogo";
import FitBadge from "./FitBadge";
import { getDisplayFitScore } from "../lib/fitDisplay";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

function KanbanCard({ application, onSelect }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const stale = isStale(application.updated_at);
  const followUpOverdue = isFollowUpOverdue(application.follow_up_date);
  const dndKeyDown = listeners?.onKeyDown;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(application)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(application); }
        dndKeyDown?.(e);
      }}
      data-testid="kanban-card"
      className={cn(
        "relative cursor-pointer rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm",
        "transition-all duration-150 hover:border-border hover:shadow-md",
        isDragging && "scale-[1.02] opacity-80 shadow-lg"
      )}
    >
      {stale && (
        <>
          <span
            className="absolute right-2 top-2 h-2 w-2 animate-pulse-dot rounded-full bg-warning/80"
            aria-hidden="true"
            data-testid="stale-indicator"
          />
          <span className="sr-only">Stale application — no updates in 14+ days</span>
        </>
      )}
      {followUpOverdue && (
        <span
          className="absolute right-6 top-2 h-2 w-2 rounded-full bg-warning"
          aria-label="Follow-up overdue"
          data-testid="follow-up-indicator"
        />
      )}
      <div className="flex items-center gap-2 pr-4">
        <CompanyLogo company_domain={application.company_domain ?? null} company={application.company ?? ""} size={20} />
        <p className="truncate font-semibold text-foreground">
          {application.company}
        </p>
      </div>
      <p className="mt-0.5 truncate text-sm text-muted-foreground">
        {application.role_title}
      </p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {formatRelative(application.date_applied)}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {application.interview_prep_briefing && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-flex cursor-default">
                  <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Interview prep briefing ready — open the card to review</TooltipContent>
            </Tooltip>
          )}
          <FitBadge score={getDisplayFitScore(application)} />
        </div>
      </div>
    </div>
  );
}

export default KanbanCard;
