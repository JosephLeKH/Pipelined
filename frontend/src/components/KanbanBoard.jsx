/** Kanban board view: one droppable column per stage, draggable application cards. */

import { useMemo, memo } from "react";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";

import { useApplications, KEYS } from "../hooks/useApplications";
import { useAuth } from "../context/AuthContext";
import { STAGES, KANBAN_SKELETON_COUNT } from "../lib/constants";
import { useKanbanDrag } from "../hooks/useKanbanDrag";
import { useKanbanMobileSwipe } from "../hooks/useKanbanMobileSwipe";
import { cn } from "../lib/utils";
import CompanyLogo from "./CompanyLogo";
import { KanbanColumn } from "./KanbanColumn";
import SkeletonRow from "./SkeletonRow";
import { getDisplayFitScore } from "../lib/fitDisplay";

function buildByStage(applications, stages) {
  const map = Object.fromEntries(stages.map((s) => [s, []]));
  for (const app of applications) {
    if (Object.prototype.hasOwnProperty.call(map, app.current_stage)) {
      map[app.current_stage].push(app);
    }
  }
  return map;
}

function KanbanDragOverlayCard({ application }) {
  const fitScore = getDisplayFitScore(application);

  return (
    <article className="w-[16.25rem] rounded-lg border border-border-1 bg-surface-0 p-3 shadow-modal">
      <div className="flex items-start gap-2">
        <CompanyLogo
          company_domain={application.company_domain ?? null}
          company={application.company ?? ""}
          size={22}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-1">{application.company}</p>
          <p className="mt-0.5 truncate text-xs text-text-2">{application.role_title}</p>
        </div>
        {fitScore != null && <span className="shrink-0 text-xs text-text-3">{fitScore}%</span>}
      </div>
    </article>
  );
}

function KanbanLoadingSkeleton({ stages }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4" aria-busy="true">
      {stages.map((stage) => (
        <div key={stage} className="flex min-w-[17.5rem] flex-1 flex-col">
          <div className="flex h-10 items-center gap-2 border-b border-border-1 bg-surface-1 px-3">
            <span className="text-sm font-medium text-text-3">{stage}</span>
          </div>
          <div className="flex flex-col gap-2 rounded-lg bg-surface-1 p-2">
            {Array.from({ length: KANBAN_SKELETON_COUNT }, (_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function KanbanMobileTabs({ stages, mobileStage, setMobileStage, byStage }) {
  return (
    <div
      className="flex h-8 overflow-x-auto border-b border-border-1 md:hidden"
      role="tablist"
      aria-label="Stage tabs"
    >
      {stages.map((stage) => {
        const active = mobileStage === stage;
        return (
          <button
            key={stage}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls="mobile-kanban-panel"
            onClick={() => setMobileStage(stage)}
            className={cn(
              "shrink-0 px-4 text-sm font-medium transition-colors motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
              active ? "border-b-2 border-brand-600 text-text-1" : "text-text-3 hover:text-text-1",
            )}
          >
            {stage}
            <span className="ml-1 text-xs text-text-3">({(byStage[stage] ?? []).length})</span>
          </button>
        );
      })}
    </div>
  );
}

function KanbanMobileView({
  stages,
  mobileStage,
  setMobileStage,
  byStage,
  onSelect,
  onAddStage,
  handleMobileTouchStart,
  handleMobileTouchEnd,
}) {
  return (
    <>
      <KanbanMobileTabs
        stages={stages}
        mobileStage={mobileStage}
        setMobileStage={setMobileStage}
        byStage={byStage}
      />
      <div
        className="mt-4 md:hidden"
        id="mobile-kanban-panel"
        data-testid="mobile-kanban-swipe"
        onTouchStart={handleMobileTouchStart}
        onTouchEnd={handleMobileTouchEnd}
      >
        <KanbanColumn
          stage={mobileStage}
          applications={byStage[mobileStage] ?? []}
          onSelect={onSelect}
          onAddStage={onAddStage}
        />
      </div>
      <div className="mt-3 flex justify-center gap-2 md:hidden" aria-label="Stage navigation dots">
        {stages.map((s) => (
          <button
            key={s}
            type="button"
            aria-label={s}
            aria-pressed={s === mobileStage}
            onClick={() => setMobileStage(s)}
            className={cn(
              "h-2 w-2 rounded-full transition-colors motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1",
              s === mobileStage ? "bg-brand-600" : "bg-text-3/30",
            )}
          />
        ))}
      </div>
    </>
  );
}

const DEFAULT_FILTERS = {};

function KanbanBoard({ filters = DEFAULT_FILTERS, onSelect, onAddStage }) {
  const { user } = useAuth();
  const stages = user?.default_stages ?? STAGES;
  const { mobileStage, setMobileStage, handleMobileTouchStart, handleMobileTouchEnd } =
    useKanbanMobileSwipe(stages);
  const queryKey = KEYS.list(filters);
  const { data: envelope, isLoading } = useApplications(filters);
  const applications = useMemo(() => envelope?.data ?? [], [envelope]);
  const byStage = useMemo(() => buildByStage(applications, stages), [applications, stages]);
  const { activeApp, sensors, handleDragStart, handleDragEnd } = useKanbanDrag({
    applications,
    stages,
    queryKey,
  });

  if (isLoading) return <KanbanLoadingSkeleton stages={stages} />;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <KanbanMobileView
        stages={stages}
        mobileStage={mobileStage}
        setMobileStage={setMobileStage}
        byStage={byStage}
        onSelect={onSelect}
        onAddStage={onAddStage}
        handleMobileTouchStart={handleMobileTouchStart}
        handleMobileTouchEnd={handleMobileTouchEnd}
      />
      <div className="hidden min-w-0 gap-3 overflow-x-auto pb-4 md:flex" data-testid="kanban-desktop">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            applications={byStage[stage] ?? []}
            onSelect={onSelect}
            onAddStage={onAddStage}
          />
        ))}
      </div>
      <DragOverlay>
        {activeApp ? <KanbanDragOverlayCard application={activeApp} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

export default memo(KanbanBoard);
