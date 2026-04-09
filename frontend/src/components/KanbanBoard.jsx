/** Kanban board view: one droppable column per stage, draggable application cards. */

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { useApplications, useUpdateApplication } from "../hooks/useApplications";
import { useAuth } from "../context/AuthContext";
import { STAGES, STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import KanbanCard from "./KanbanCard";

const COLUMN_MAX_HEIGHT_PX = 600;

function KanbanColumn({ stage, applications, onSelect }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const color = STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR;
  const cardIds = applications.map((a) => a.id);

  return (
    <div
      className="flex min-w-[240px] flex-1 flex-col rounded-lg"
      data-testid={`kanban-column-${stage}`}
      aria-label={`${stage} column`}
    >
      <div className={`flex items-center gap-2 rounded-t-lg px-3 py-2 ${color.bg}`}>
        <span className={`text-sm font-semibold ${color.text}`}>{stage}</span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}
          style={{ opacity: 0.7 }}
          aria-label={`${applications.length} applications`}
        >
          {applications.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        style={{ maxHeight: COLUMN_MAX_HEIGHT_PX }}
        className={`flex flex-col gap-2 overflow-y-auto rounded-b-lg bg-gray-100 p-2 transition-colors dark:bg-gray-800 ${
          isOver ? "bg-blue-50 dark:bg-blue-900/20" : ""
        }`}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {applications.length === 0 ? (
            <div
              className="flex h-16 items-center justify-center rounded border-2 border-dashed border-gray-300 text-sm text-gray-400 dark:border-gray-600 dark:text-gray-500"
              aria-label="No applications"
            >
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

function KanbanBoard({ filters = {}, onSelect }) {
  const { user } = useAuth();
  const stages = user?.default_stages ?? STAGES;

  const [mobileStage, setMobileStage] = useState(stages[0] ?? "");
  const [activeId, setActiveId] = useState(null);

  const { data: envelope, isLoading } = useApplications(filters);
  const applications = useMemo(() => envelope?.data ?? [], [envelope]);
  const updateMutation = useUpdateApplication();

  const byStage = useMemo(() => {
    const map = Object.fromEntries(stages.map((s) => [s, []]));
    for (const app of applications) {
      if (Object.prototype.hasOwnProperty.call(map, app.current_stage)) {
        map[app.current_stage].push(app);
      }
    }
    return map;
  }, [applications, stages]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeApp = activeId ? applications.find((a) => a.id === activeId) : null;

  const handleDragStart = ({ active }) => setActiveId(active.id);

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over) return;

    const srcApp = applications.find((a) => a.id === active.id);
    if (!srcApp) return;

    const targetStage = stages.includes(over.id)
      ? over.id
      : (applications.find((a) => a.id === over.id)?.current_stage ?? null);

    if (!targetStage || srcApp.current_stage === targetStage) return;

    updateMutation.mutate({ id: active.id, body: { current_stage: targetStage } });
  };

  if (isLoading) {
    return <div className="py-16 text-center text-gray-500">Loading…</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Mobile: horizontal scrollable tab bar */}
      <div
        className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 md:hidden"
        role="tablist"
        aria-label="Stage tabs"
      >
        {stages.map((stage) => (
          <button
            key={stage}
            type="button"
            role="tab"
            aria-selected={mobileStage === stage}
            onClick={() => setMobileStage(stage)}
            className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${
              mobileStage === stage
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {stage}
            <span className="ml-1 text-xs text-gray-400">
              ({(byStage[stage] ?? []).length})
            </span>
          </button>
        ))}
      </div>

      {/* Mobile: single column view */}
      <div className="mt-4 md:hidden">
        <KanbanColumn
          stage={mobileStage}
          applications={byStage[mobileStage] ?? []}
          onSelect={onSelect}
        />
      </div>

      {/* Desktop: all columns side by side */}
      <div className="hidden gap-4 overflow-x-auto pb-4 md:flex" data-testid="kanban-desktop">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            applications={byStage[stage] ?? []}
            onSelect={onSelect}
          />
        ))}
      </div>

      <DragOverlay>
        {activeApp ? (
          <div className="rotate-1 rounded-lg bg-white p-3 opacity-90 shadow-lg ring-1 ring-gray-300 dark:bg-gray-800 dark:ring-gray-600">
            <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
              {activeApp.company}
            </p>
            <p className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-400">
              {activeApp.role_title}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default KanbanBoard;
