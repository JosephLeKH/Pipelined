/** Kanban board view: one droppable column per stage, draggable application cards. */

import { useMemo, memo } from "react";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";

import { useApplications, KEYS } from "../hooks/useApplications";
import { useAuth } from "../context/AuthContext";
import { STAGES, KANBAN_SKELETON_COUNT } from "../lib/constants";
import { useKanbanDrag } from "../hooks/useKanbanDrag";
import { useKanbanMobileSwipe } from "../hooks/useKanbanMobileSwipe";
import { KanbanColumn } from "./KanbanColumn";
import SkeletonRow from "./SkeletonRow";

function buildByStage(applications, stages) {
  const map = Object.fromEntries(stages.map((s) => [s, []]));
  for (const app of applications) {
    if (Object.prototype.hasOwnProperty.call(map, app.current_stage)) {
      map[app.current_stage].push(app);
    }
  }
  return map;
}

function KanbanLoadingSkeleton({ stages }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4" aria-busy="true">
      {stages.map((stage) => (
        <div key={stage} className="flex min-w-[240px] flex-1 flex-col rounded-lg">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{stage}</span>
          </div>
          <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-800/50">
            {Array.from({ length: KANBAN_SKELETON_COUNT }, (_, i) => <SkeletonRow key={i} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function KanbanMobileView({ stages, mobileStage, setMobileStage, byStage, onSelect, handleMobileTouchStart, handleMobileTouchEnd }) {
  return (
    <>
      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 md:hidden" role="tablist" aria-label="Stage tabs">
        {stages.map((stage) => (
          <button key={stage} type="button" role="tab" aria-selected={mobileStage === stage} onClick={() => setMobileStage(stage)}
            className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${mobileStage === stage ? "border-b-2 border-brand-600 text-brand-600" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}>
            {stage}
            <span className="ml-1 text-xs text-gray-400">({(byStage[stage] ?? []).length})</span>
          </button>
        ))}
      </div>
      <div className="mt-4 md:hidden" data-testid="mobile-kanban-swipe" onTouchStart={handleMobileTouchStart} onTouchEnd={handleMobileTouchEnd}>
        <KanbanColumn stage={mobileStage} applications={byStage[mobileStage] ?? []} onSelect={onSelect} />
      </div>
      <div className="mt-3 flex justify-center gap-2 md:hidden" aria-label="Stage navigation dots">
        {stages.map((s) => (
          <button key={s} type="button" aria-label={s} aria-pressed={s === mobileStage} onClick={() => setMobileStage(s)}
            className={`h-2 w-2 rounded-full transition-colors ${s === mobileStage ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"}`} />
        ))}
      </div>
    </>
  );
}

function KanbanBoard({ filters = {}, onSelect }) {
  const { user } = useAuth();
  const stages = user?.default_stages ?? STAGES;
  const { mobileStage, setMobileStage, handleMobileTouchStart, handleMobileTouchEnd } = useKanbanMobileSwipe(stages);
  const queryKey = KEYS.list(filters);
  const { data: envelope, isLoading } = useApplications(filters);
  const applications = useMemo(() => envelope?.data ?? [], [envelope]);
  const byStage = useMemo(() => buildByStage(applications, stages), [applications, stages]);
  const { activeApp, sensors, handleDragStart, handleDragEnd } = useKanbanDrag({ applications, stages, queryKey });

  if (isLoading) return <KanbanLoadingSkeleton stages={stages} />;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <KanbanMobileView stages={stages} mobileStage={mobileStage} setMobileStage={setMobileStage}
        byStage={byStage} onSelect={onSelect} handleMobileTouchStart={handleMobileTouchStart} handleMobileTouchEnd={handleMobileTouchEnd} />
      <div className="hidden gap-4 overflow-x-auto pb-4 md:flex" data-testid="kanban-desktop">
        {stages.map((stage) => (
          <KanbanColumn key={stage} stage={stage} applications={byStage[stage] ?? []} onSelect={onSelect} />
        ))}
      </div>
      <DragOverlay>
        {activeApp ? (
          <div className="rotate-1 rounded-card bg-white p-3 opacity-90 shadow-lg ring-1 ring-gray-300 dark:bg-gray-800 dark:ring-gray-600">
            <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{activeApp.company}</p>
            <p className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-400">{activeApp.role_title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default memo(KanbanBoard);
