/** Content area for JobBoard: loading skeleton, error, empty state, job grid, load more. */

import ApiErrorMessage from "../components/ApiErrorMessage";
import JobCard from "../components/JobCard";
import { BUTTON_GHOST, BUTTON_SECONDARY } from "../lib/designTokens";

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-52 animate-pulse rounded-card bg-surface-tertiary" />
      ))}
    </div>
  );
}

function BriefcaseSvg() {
  return (
    <svg width="88" height="80" viewBox="0 0 88 80" fill="none" aria-hidden="true">
      {/* Case body */}
      <rect x="8" y="28" width="72" height="42" rx="8" fill="#fae4d4" className="dark:fill-brand-900/40" stroke="#d97757" strokeWidth="2" />
      {/* Handle */}
      <path d="M30 28V22a6 6 0 0112 0v6" stroke="#d97757" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Clasp bar */}
      <rect x="8" y="44" width="72" height="6" rx="2" fill="#d97757" opacity="0.3" />
      {/* Clasp center */}
      <rect x="37" y="42" width="14" height="10" rx="3" fill="#d97757" opacity="0.7" />
      {/* Search lens */}
      <circle cx="65" cy="20" r="10" fill="none" stroke="#eeac80" strokeWidth="2.5" />
      <line x1="72" y1="27" x2="78" y2="33" stroke="#eeac80" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <BriefcaseSvg />
      <div>
        <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No listings match your filters</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters or search terms</p>
      </div>
      {hasFilters && (
        <button type="button" onClick={onClear} className={BUTTON_GHOST}>Clear filters</button>
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
          <button type="button" onClick={onLoadMore} className={BUTTON_SECONDARY}>
            Load more
          </button>
        </div>
      )}
    </>
  );
}
