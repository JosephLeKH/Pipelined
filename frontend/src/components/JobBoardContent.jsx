/** Content area for JobBoard: loading skeleton, error, empty state, job grid, load more. */

import Briefcase from "lucide-react/dist/esm/icons/briefcase";

import ApiErrorMessage from "../components/ApiErrorMessage";
import EmptyState from "../components/EmptyState";
import JobCard from "../components/JobCard";
import { Button } from "./ui/button";

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-52 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

function JobBoardEmptyState({ hasFilters, onClear }) {
  return (
    <EmptyState
      icon={Briefcase}
      title="No listings match your filters"
      description="Try adjusting your filters or search terms"
      action={
        hasFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        ) : null
      }
    />
  );
}

export function JobBoardContent({ isLoading, error, jobs, total, hasFilters, hasMore, onClearFilters, onLoadMore, onSelectJob, refetch }) {
  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ApiErrorMessage error={error} onRetry={refetch} />;
  if (jobs.length === 0) return <JobBoardEmptyState hasFilters={hasFilters} onClear={onClearFilters} />;
  return (
    <>
      {total > 0 && (
        <p className="text-sm text-muted-foreground">
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
          <Button type="button" variant="outline" onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </>
  );
}
