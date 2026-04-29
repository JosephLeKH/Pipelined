/** Header toolbar for Dashboard: page title, view toggle, Import/Export/Add buttons. */

import LayoutGrid from "lucide-react/dist/esm/icons/layout-grid";
import List from "lucide-react/dist/esm/icons/list";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_TOGGLE_ACTIVE, BUTTON_TOGGLE_INACTIVE } from "../lib/designTokens";

export function DashboardToolbar({ viewMode, onSetViewMode, isExporting, onImport, onExport, onAdd }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="font-display text-2xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
        <div className="flex rounded border border-gray-300 dark:border-gray-600">
          <button
            type="button"
            aria-label="List view"
            aria-pressed={viewMode === "list"}
            onClick={() => onSetViewMode("list")}
            className={`rounded-l px-2 py-1.5 transition-colors ${viewMode === "list" ? BUTTON_TOGGLE_ACTIVE : BUTTON_TOGGLE_INACTIVE}`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Kanban view"
            aria-pressed={viewMode === "kanban"}
            onClick={() => onSetViewMode("kanban")}
            className={`rounded-r px-2 py-1.5 transition-colors ${viewMode === "kanban" ? BUTTON_TOGGLE_ACTIVE : BUTTON_TOGGLE_INACTIVE}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
        <button type="button" onClick={onImport} className={BUTTON_SECONDARY}>
          Import CSV
        </button>
        <button type="button" onClick={onExport} disabled={isExporting} className={`${BUTTON_SECONDARY} flex items-center gap-2`}>
          {isExporting && <Loader2 className="h-4 w-4 animate-spin" />}
          Export CSV
        </button>
        <button type="button" onClick={onAdd} title="Add Application (A)" className={BUTTON_PRIMARY}>
          Add Application
        </button>
      </div>
    </div>
  );
}
