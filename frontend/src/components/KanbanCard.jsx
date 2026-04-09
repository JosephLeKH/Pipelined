/** Draggable Kanban card showing company, role, date applied, and stale indicator. */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { STALE_APPLICATION_DAYS } from "../lib/constants";
import { formatRelative } from "../lib/dateUtils";

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
      <p className="truncate pr-4 font-semibold text-gray-900 dark:text-gray-100">
        {application.company}
      </p>
      <p className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-400">
        {application.role_title}
      </p>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        {formatRelative(application.date_applied)}
      </p>
    </div>
  );
}

export default KanbanCard;
