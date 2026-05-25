/** Content area for JobBoard: loading skeleton, error, empty state, dense job list, load more. */

import ApiErrorMessage from "../components/ApiErrorMessage";
import JobRow from "../components/JobRow";
import { Button } from "./ui/button";

const SKELETON_ROW_COUNT = 8;

function LoadingSkeleton() {
  return (
    <div className="flex flex-col" data-testid="job-list-skeleton">
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
        <div key={i} className="h-10 animate-pulse border-b border-border-1 bg-surface-1/50" />
      ))}
    </div>
  );
}

function BriefcaseSvg() {
  return (
    <svg width="88" height="80" viewBox="0 0 88 80" fill="none" aria-hidden="true">
      <rect x="8" y="28" width="72" height="42" rx="8" fill="#FAE0E0" className="dark:fill-brand-900/40" stroke="#8C1515" strokeWidth="2" />
      <path d="M30 28V22a6 6 0 0112 0v6" stroke="#8C1515" strokeWidth="2" strokeLinecap="round" fill="none" />
      <rect x="8" y="44" width="72" height="6" rx="2" fill="#8C1515" opacity="0.3" />
      <rect x="37" y="42" width="14" height="10" rx="3" fill="#8C1515" opacity="0.7" />
      <circle cx="65" cy="20" r="10" fill="none" stroke="#F4BFBF" strokeWidth="2.5" />
      <line x1="72" y1="27" x2="78" y2="33" stroke="#F4BFBF" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <BriefcaseSvg />
      <div>
        <p className="text-base font-semibold text-text-1">No listings match your filters</p>
        <p className="mt-1 text-sm text-text-3">Try adjusting your filters or search terms</p>
      </div>
      {hasFilters && (
        <Button type="button" variant="ghost" onClick={onClear}>Clear filters</Button>
      )}
    </div>
  );
}

export function JobBoardContent({
  isLoading,
  error,
  jobs,
  total,
  hasFilters,
  hasMore,
  onClearFilters,
  onLoadMore,
  onSelectJob,
  refetch,
  selectedJobId = null,
}) {
  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ApiErrorMessage error={error} onRetry={refetch} />;
  if (jobs.length === 0) return <EmptyState hasFilters={hasFilters} onClear={onClearFilters} />;

  return (
    <section aria-labelledby="all-jobs-heading" className="flex flex-col">
      <header className="flex items-baseline justify-between border-b border-border-1 px-4 py-2">
        <h2 id="all-jobs-heading" className="text-sm font-semibold text-text-1">
          All jobs
        </h2>
        {total > 0 && (
          <p className="text-xs text-text-3">
            {jobs.length} of {total} result{total !== 1 ? "s" : ""}
          </p>
        )}
      </header>

      <div role="rowgroup" data-testid="job-list">
        {jobs.map((job) => (
          <JobRow
            key={job.id}
            job={job}
            onSelect={onSelectJob}
            isSelected={selectedJobId === job.id}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex flex-col items-center gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </section>
  );
}
