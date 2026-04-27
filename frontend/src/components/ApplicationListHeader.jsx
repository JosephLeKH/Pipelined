/** Sortable column header row for the application list. */

function ColumnHeader({ field, label, sortBy, sortOrder, onSort }) {
  const isActive = sortBy === field;
  return (
    <button
      type="button"
      className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2 dark:text-gray-400 dark:hover:text-gray-100"
      onClick={() => onSort(field)}
    >
      {label}
      {isActive && <span>{sortOrder === "asc" ? "↑" : "↓"}</span>}
    </button>
  );
}

export function ApplicationListHeader({ sortBy, sortOrder, onSort, allSelected, onSelectAll }) {
  return (
    <div className="flex items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
      <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          aria-label="Select all applications"
          checked={allSelected}
          onChange={onSelectAll}
          className="h-4 w-4 rounded border-gray-300 text-brand-600"
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
