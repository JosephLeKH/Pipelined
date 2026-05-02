/** Header toolbar for Dashboard: page title, view toggle, Import/Export/Add buttons. */

import LayoutGrid from "lucide-react/dist/esm/icons/layout-grid";
import List from "lucide-react/dist/esm/icons/list";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { Button } from "./ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { cn } from "../lib/utils";

export function DashboardToolbar({ viewMode, onSetViewMode, isExporting, onImport, onExport, onAdd }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="font-display text-2xl font-semibold text-foreground">Dashboard</h1>
      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
        <div className="flex overflow-hidden rounded-md border border-input">
          <Button type="button" variant="ghost" aria-label="List view" aria-pressed={viewMode === "list"}
            onClick={() => onSetViewMode("list")}
            className={cn("rounded-l-md rounded-r-none h-auto px-2 py-1.5",
              viewMode === "list"
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
            <List className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" aria-label="Kanban view" aria-pressed={viewMode === "kanban"}
            onClick={() => onSetViewMode("kanban")}
            className={cn("rounded-r-md rounded-l-none border-l border-input h-auto px-2 py-1.5",
              viewMode === "kanban"
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
        <Button type="button" variant="outline" onClick={onImport}>
          Import CSV
        </Button>
        <Button type="button" variant="outline" onClick={onExport} disabled={isExporting} className="flex items-center gap-2">
          {isExporting && <Loader2 className="h-4 w-4 animate-spin" />}
          Export CSV
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" onClick={onAdd}>
              Add Application
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Application (A)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
