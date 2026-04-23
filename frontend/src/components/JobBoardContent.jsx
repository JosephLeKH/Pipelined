/** Content area for JobBoard: loading skeleton, error, empty state, job grid, load more. */

import Search from "lucide-react/dist/esm/icons/search";

import ApiErrorMessage from "../components/ApiErrorMessage";
import JobCard from "../components/JobCard";
import { BUTTON_GHOST } from "../lib/designTokens";

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-52 animate-pulse rounded-card bg-gray-100 dark:bg-gray-700" />
      ))}
    </div>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <Search className="h-12 w-12 text-gray-300 dark:text-gray-600" aria-hidden="true" />
      <div>
        <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No jobs match your search</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters or search terms</p>
      </div>
      {hasFilters && (
        <button type="button" onClick={onClear} className={BUTTON_GHOST}>Clear Filters</button>
      )}
    </div>
  );
}

export function JobBoardContent({ isLoading, error, jobs, total, hasFilters, hasMore, onClearFilters, onLoadMore, onSelectJob, refetch }) {
  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ApiErrorMessage error={error} onRetry={refetch} />;
  if (jobs.length === 0) return <EmptyState hasFilters={hasFilters} onClear={onClearFilters} />;
  return (
    <>
      {total > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing {jobs.length} of {total} result{total !== 1 ? "s" : ""}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onSelect={onSelectJob} />
        ))}
      </div>
      {hasMore && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <button type="button" onClick={onLoadMore} className="rounded-button border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
            Load more
          </button>
        </div>
      )}
    </>
  );
}
