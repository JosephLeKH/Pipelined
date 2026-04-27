/** Loading skeleton, error, and empty-state renders for ApplicationList. */

import { SKELETON_ROW_COUNT } from "../lib/constants";
import ApiErrorMessage from "./ApiErrorMessage";
import EmptyState from "./EmptyState";
import SkeletonRow from "./SkeletonRow";

function PipelineSvg() {
  return (
    <svg width="96" height="80" viewBox="0 0 96 80" fill="none" aria-hidden="true">
      {/* Funnel body */}
      <path d="M12 8h72l-28 30v26l-16-8V38L12 8z" fill="#fae4d4" className="dark:fill-brand-900/40" stroke="#d97757" strokeWidth="2" strokeLinejoin="round" />
      {/* Funnel top bar */}
      <rect x="8" y="4" width="80" height="10" rx="5" fill="#d97757" opacity="0.85" />
      {/* Stage dots */}
      <circle cx="48" cy="46" r="4" fill="#d97757" />
      <circle cx="48" cy="60" r="3" fill="#e48f5a" />
      <circle cx="48" cy="71" r="2.5" fill="#eeac80" />
    </svg>
  );
}

export function ApplicationListEmpty({ isLoading, error, refetch, applications, filters, onClearFilters, onAdd, onImportCsv }) {
  if (isLoading) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (error) return <ApiErrorMessage error={error} onRetry={refetch} />;

  if (!applications.length) {
    const hasFilters = Object.keys(filters).length > 0;
    if (hasFilters) {
      return (
        <div className="py-16 text-center text-gray-500">
          <p>No applications match your filters.</p>
          {onClearFilters && (
            <button type="button" onClick={onClearFilters} className="mt-3 text-sm text-brand-600 hover:underline">
              Clear all filters
            </button>
          )}
        </div>
      );
    }
    const actionButtons = [
      ...(onAdd ? [{ label: "Add Application", onClick: onAdd }] : []),
      ...(onImportCsv ? [{ label: "Import CSV", onClick: onImportCsv }] : []),
    ];
    return (
      <EmptyState
        title="No applications yet"
        description="Start tracking your job search by adding your first application."
        svg={<PipelineSvg />}
        actionButton={actionButtons.length > 0 ? actionButtons : undefined}
      />
    );
  }

  return null;
}
