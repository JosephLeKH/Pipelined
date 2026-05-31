/** Sticky Dashboard sub-header: title, count, view toggle, import/export/add actions. */

import LayoutGrid from "lucide-react/dist/esm/icons/layout-grid";
import List from "lucide-react/dist/esm/icons/list";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { Button } from "./ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { cn } from "../lib/utils";

function ViewToggle({ viewMode, onChange }) {
  const segmentClass = (active) =>
    cn(
      "inline-flex h-7 w-8 items-center justify-center rounded motion-reduce:transition-none",
      "transition-colors duration-hover ease-out",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2",
      "dark:focus-visible:outline-1",
      active ? "bg-surface-0 text-text-1 shadow-sm" : "text-text-2 hover:text-text-1"
    );

  return (
    <div
      role="group"
      aria-label="View mode"
      className="flex rounded-md bg-surface-1 p-0.5"
    >
      <button
        type="button"
        aria-label="List view"
        aria-pressed={viewMode === "list"}
        onClick={() => onChange("list")}
        className={segmentClass(viewMode === "list")}
      >
        <List className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Kanban view"
        aria-pressed={viewMode === "kanban"}
        onClick={() => onChange("kanban")}
        className={segmentClass(viewMode === "kanban")}
      >
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function DashboardToolbar({
  viewMode,
  onSetViewMode,
  applicationCount,
  isExporting,
  onImport,
  onExport,
  onAdd,
}) {
  const countLabel =
    applicationCount == null
      ? null
      : `${applicationCount} application${applicationCount === 1 ? "" : "s"}`;

  return (
    <div className="sticky top-11 z-20 flex min-h-14 shrink-0 flex-col gap-3 border-b border-border-1 bg-surface-0/90 px-4 py-2 backdrop-blur motion-reduce:backdrop-blur-none sm:flex-row sm:items-center sm:py-0">
      <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
        <h1 className="text-base font-semibold text-text-1">Dashboard</h1>
        {countLabel != null && (
          <span className="text-xs text-text-3">{countLabel}</span>
        )}
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
        <ViewToggle viewMode={viewMode} onChange={onSetViewMode} />
        <Button type="button" variant="secondary" size="sm" onClick={onImport} className="whitespace-nowrap">
          Import CSV
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onExport}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          {isExporting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Export
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="default" size="sm" onClick={onAdd} aria-keyshortcuts="a" className="whitespace-nowrap">
              <span>+ Add</span>
              <span className="hidden sm:inline">application</span>
              <kbd className="hidden rounded bg-white/20 px-1 py-0.5 text-[0.625rem] sm:inline">
                A
              </kbd>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add application (A)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
