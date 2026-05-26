/** Droppable Kanban column — sticky header, tray body, hover add button (PRD-04 §8.1). */

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Plus from "lucide-react/dist/esm/icons/plus";
import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { cn } from "../lib/utils";
import KanbanCard from "./KanbanCard";

function KanbanColumnHeader({ stage, count, dotColor, onAddStage }) {
  return (
    <div className="group sticky top-0 z-10 flex h-10 shrink-0 items-center gap-2 border-b border-border-1 bg-surface-1 px-3">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-hidden="true"
      />
      <span className="text-sm font-medium text-text-1">{stage}</span>
      <span className="text-xs text-text-3" aria-label={`${count} applications`}>
        ({count})
      </span>
      {onAddStage && (
        <button
          type="button"
          onClick={() => onAddStage(stage)}
          aria-label={`Add application to ${stage}`}
          className={cn(
            "ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-text-3",
            "opacity-0 transition-opacity duration-150 motion-reduce:transition-none group-hover:opacity-100",
            "hover:bg-surface-2 hover:text-text-1",
            "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function KanbanColumnBody({ applications, isOver, onSelect, setNodeRef }) {
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex max-h-[37.5rem] flex-col gap-2 overflow-y-auto rounded-lg bg-surface-1 p-2",
        "motion-reduce:transition-none transition-colors duration-150",
        isOver && "ring-2 ring-inset ring-brand-600/30",
      )}
    >
      <SortableContext items={applications.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        {applications.length === 0 ? (
          <div
            className="flex h-14 items-center justify-center rounded-lg border border-dashed border-border-1 text-xs text-text-3"
            aria-label="Drop applications here"
          >
            Drop applications here
          </div>
        ) : (
          applications.map((app) => (
            <KanbanCard key={app.id} application={app} onSelect={onSelect} />
          ))
        )}
      </SortableContext>
    </div>
  );
}

export function KanbanColumn({ stage, applications, onSelect, onAddStage }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const color = STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR;

  return (
    <div
      className="flex min-w-[16.25rem] flex-1 flex-col"
      data-testid={`kanban-column-${stage}`}
      aria-label={`${stage} column`}
    >
      <KanbanColumnHeader
        stage={stage}
        count={applications.length}
        dotColor={color.dotColor}
        onAddStage={onAddStage}
      />
      <KanbanColumnBody
        applications={applications}
        isOver={isOver}
        onSelect={onSelect}
        setNodeRef={setNodeRef}
      />
    </div>
  );
}
