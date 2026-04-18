/** Droppable Kanban column with header badge and sorted card list. */

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import KanbanCard from "./KanbanCard";

const COLUMN_MAX_HEIGHT_PX = 600;

export function KanbanColumn({ stage, applications, onSelect }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const color = STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR;
  return (
    <div
      className="flex min-w-[240px] flex-1 flex-col rounded-lg"
      data-testid={`kanban-column-${stage}`}
      aria-label={`${stage} column`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={`h-2 w-2 rounded-full ${color.dot}`} aria-hidden="true" />
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{stage}</span>
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400" aria-label={`${applications.length} applications`}>
          {applications.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        style={{ maxHeight: COLUMN_MAX_HEIGHT_PX }}
        className={`flex flex-col gap-2 overflow-y-auto rounded-lg bg-slate-50 p-2 transition-colors dark:bg-slate-800/50 ${
          isOver ? "bg-brand-50 dark:bg-brand-900/20" : ""
        }`}
      >
        <SortableContext items={applications.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          {applications.length === 0 ? (
            <div className="flex h-16 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500" aria-label="No applications">
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
