/** Loading skeleton, error, and empty-state renders for ApplicationList. */

import FolderOpen from "lucide-react/dist/esm/icons/folder-open";
import { SKELETON_ROW_COUNT } from "../lib/constants";
import ApiErrorMessage from "./ApiErrorMessage";
import EmptyState from "./EmptyState";
import SkeletonRow from "./SkeletonRow";

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
        icon={FolderOpen}
        actionButton={actionButtons.length > 0 ? actionButtons : undefined}
      />
    );
  }

  return null;
}
