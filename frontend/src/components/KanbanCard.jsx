/** Draggable Kanban card showing company, role, date applied, and stale indicator. */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Bell from "lucide-react/dist/esm/icons/bell";

import { formatRelative, isStale, isFollowUpOverdue } from "../lib/dateUtils";
import CompanyLogo from "./CompanyLogo";
import FitBadge from "./FitBadge";

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(application)}
      data-testid="kanban-card"
      className={`relative cursor-pointer rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200 hover:shadow-md dark:bg-gray-800 dark:ring-gray-700 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {stale && (
        <span
          className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400"
          aria-label="Stale application — no updates in 14+ days"
          data-testid="stale-indicator"
        />
      )}
      {followUpOverdue && (
        <span
          className="absolute right-6 top-2 h-2 w-2 rounded-full bg-yellow-400"
          aria-label="Follow-up overdue"
          data-testid="follow-up-indicator"
        />
      )}
      <div className="flex items-center gap-2 pr-4">
        <CompanyLogo company_domain={application.company_domain ?? null} company={application.company ?? ""} size={20} />
        <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
          {application.company}
        </p>
      </div>
      <p className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-400">
        {application.role_title}
      </p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {formatRelative(application.date_applied)}
        </p>
        <FitBadge score={application.ai_analysis?.fit_score ?? null} />
      </div>
    </div>
  );
}

export default KanbanCard;
