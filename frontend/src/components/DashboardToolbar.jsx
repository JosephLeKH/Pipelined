/** Header toolbar for Dashboard: page title, view toggle, Import/Export/Add buttons. */

import LayoutGrid from "lucide-react/dist/esm/icons/layout-grid";
import List from "lucide-react/dist/esm/icons/list";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

const VIEW_BTN_ACTIVE = "bg-blue-600 text-white";
const VIEW_BTN_INACTIVE = "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700";

export function DashboardToolbar({ viewMode, onSetViewMode, isExporting, onImport, onExport, onAdd }) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
      <div className="flex items-center gap-2">
        <div className="flex rounded border border-gray-300 dark:border-gray-600">
          <button
            type="button"
            aria-label="List view"
            aria-pressed={viewMode === "list"}
            onClick={() => onSetViewMode("list")}
            className={`rounded-l px-2 py-1.5 transition-colors ${viewMode === "list" ? VIEW_BTN_ACTIVE : VIEW_BTN_INACTIVE}`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Kanban view"
            aria-pressed={viewMode === "kanban"}
            onClick={() => onSetViewMode("kanban")}
            className={`rounded-r px-2 py-1.5 transition-colors ${viewMode === "kanban" ? VIEW_BTN_ACTIVE : VIEW_BTN_INACTIVE}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
        <button type="button" onClick={onImport} className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
          Import CSV
        </button>
        <button type="button" onClick={onExport} disabled={isExporting} className="flex items-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
          {isExporting && <Loader2 className="h-4 w-4 animate-spin" />}
          Export CSV
        </button>
        <button type="button" onClick={onAdd} title="Add Application (A)" className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Add Application
        </button>
      </div>
    </div>
  );
}
