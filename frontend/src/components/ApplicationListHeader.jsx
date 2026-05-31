/** Sortable column header row for the application list (Linear dense layout). */

import { Checkbox } from "./ui/checkbox";
import { cn } from "../lib/utils";

const HEADER_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

function SortHeader({ field, label, sortBy, sortOrder, onSort }) {
  const isActive = sortBy === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        "inline-flex min-h-6 min-w-6 items-center gap-0.5 px-1 py-0.5 text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-text-3",
        "hover:text-text-1 motion-reduce:transition-none transition-colors duration-hover ease-out",
        HEADER_FOCUS,
        isActive && "text-text-2"
      )}
    >
      {label}
      {isActive && (
        <span className="text-[0.5rem] leading-none" aria-hidden="true">
          {sortOrder === "asc" ? "▲" : "▼"}
        </span>
      )}
    </button>
  );
}

export function ApplicationListHeader({ sortBy, sortOrder, onSort, allSelected, onSelectAll }) {
  return (
    <div
      className="hidden h-8 items-center gap-2 border-b border-border-2 bg-surface-1 px-4 md:flex"
      data-testid="application-list-header"
    >
      <span className="w-4 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          aria-label="Select all applications"
          checked={allSelected}
          onCheckedChange={onSelectAll}
          className="h-4 w-4"
        />
      </span>
      <span className="w-2 shrink-0" aria-hidden="true" />
      <span className="w-[18px] shrink-0" aria-hidden="true" />
      <div className="w-40 shrink-0">
        <SortHeader field="company" label="Company" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
      </div>
      <div className="min-w-0 flex-1">
        <SortHeader field="role_title" label="Role" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
      </div>
      <div className="w-24 shrink-0">
        <SortHeader field="current_stage" label="Stage" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
      </div>
      <span className="w-4 shrink-0" aria-hidden="true" />
      <div className="w-11 shrink-0 text-right">
        <span className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-text-3">
          Score
        </span>
      </div>
      <span className="w-4 shrink-0" aria-hidden="true" />
      <span className="w-4 shrink-0" aria-hidden="true" />
      <div className="w-20 shrink-0">
        <SortHeader field="updated_at" label="Updated" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
      </div>
      <span className="w-7 shrink-0" aria-hidden="true" />
    </div>
  );
}
