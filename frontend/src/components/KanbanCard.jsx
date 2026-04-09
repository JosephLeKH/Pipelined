/** Draggable Kanban card showing company, role, date applied, and stale indicator. */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { STALE_APPLICATION_DAYS } from "../lib/constants";
import { formatRelative } from "../lib/dateUtils";
import CompanyLogo from "./CompanyLogo";
import FitBadge from "./FitBadge";

const MS_PER_DAY = 86_400_000;

function isStale(updatedAt) {
  return Date.now() - new Date(updatedAt).getTime() > STALE_APPLICATION_DAYS * MS_PER_DAY;
}

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
