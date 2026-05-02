/** Sortable column header row for the application list. */

import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";

function ColumnHeader({ field, label, sortBy, sortOrder, onSort }) {
  const isActive = sortBy === field;
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onSort(field)}
      className="h-auto gap-1 p-0 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
    >
      {label}
      {isActive && <span>{sortOrder === "asc" ? "↑" : "↓"}</span>}
    </Button>
  );
}

export function ApplicationListHeader({ sortBy, sortOrder, onSort, allSelected, onSelectAll }) {
  return (
    <div className="flex items-center gap-4 border-b border-border bg-muted px-4 py-2">
      <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          aria-label="Select all applications"
          checked={allSelected}
          onCheckedChange={onSelectAll}
        />
      </span>
      <div className="w-2 shrink-0" />
      <ColumnHeader field="company" label="Company" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
      <ColumnHeader field="role_title" label="Role" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
      <ColumnHeader field="current_stage" label="Stage" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
      <ColumnHeader field="date_applied" label="Date Applied" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
    </div>
  );
}
