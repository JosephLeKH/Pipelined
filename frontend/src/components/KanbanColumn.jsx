/** Droppable Kanban column with header badge and sorted card list. */

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { CARD_BASE } from "../lib/designTokens";
import KanbanCard from "./KanbanCard";

const COLUMN_MAX_HEIGHT_PX = 600;

export function KanbanColumn({ stage, applications, onSelect }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const color = STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR;
  return (
    <div
      className={`flex min-w-[240px] flex-1 flex-col overflow-hidden ${CARD_BASE}`}
      data-testid={`kanban-column-${stage}`}
      aria-label={`${stage} column`}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-default">
        <span className={`h-2 w-2 rounded-full ${color.dot}`} aria-hidden="true" />
        <span className="text-sm font-medium text-gray-600">{stage}</span>
        <span className="rounded-full bg-surface-secondary px-1.5 py-0.5 text-xs font-medium text-gray-500" aria-label={`${applications.length} applications`}>
          {applications.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        style={{ maxHeight: COLUMN_MAX_HEIGHT_PX }}
        className={`flex flex-col gap-2 overflow-y-auto p-2 transition-colors ${
          isOver ? "bg-brand-50" : "bg-surface-secondary"
        }`}
      >
        <SortableContext items={applications.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          {applications.length === 0 ? (
            <div className="flex h-16 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-400 dark:border-gray-600 dark:text-gray-500" aria-label="No applications">
              No applications
            </div>
          ) : (
            applications.map((app) => (
              <KanbanCard key={app.id} application={app} onSelect={onSelect} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
