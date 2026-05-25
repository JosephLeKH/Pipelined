/** Loading skeleton, error, and empty-state renders for ApplicationList. */

import { SKELETON_ROW_COUNT } from "../lib/constants";
import { Button } from "./ui/button";
import ApiErrorMessage from "./ApiErrorMessage";
import EmptyState from "./EmptyState";
import SkeletonRow from "./SkeletonRow";

function PipelineSvg() {
  return (
    <svg width="96" height="80" viewBox="0 0 96 80" fill="none" aria-hidden="true">
      {/* Funnel body */}
      <path d="M12 8h72l-28 30v26l-16-8V38L12 8z" fill="#FAE0E0" className="dark:fill-brand-900/40" stroke="#8C1515" strokeWidth="2" strokeLinejoin="round" />
      {/* Funnel top bar */}
      <rect x="8" y="4" width="80" height="10" rx="5" fill="#8C1515" opacity="0.85" />
      {/* Stage dots */}
      <circle cx="48" cy="46" r="4" fill="#8C1515" />
      <circle cx="48" cy="60" r="3" fill="#B81E1E" />
      <circle cx="48" cy="71" r="2.5" fill="#F4BFBF" />
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
        <EmptyState
          title="No applications match your filters"
          action={
            onClearFilters ? (
              <Button type="button" variant="link" onClick={onClearFilters} className="h-auto p-0 text-sm">
                Clear all filters
              </Button>
            ) : undefined
          }
        />
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
