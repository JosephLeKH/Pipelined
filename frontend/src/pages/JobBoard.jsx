/** Job board page: curated marketplace with rich cards and slide-in detail panel. */

import { useEffect, useState, useCallback } from "react";

import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import XIcon from "lucide-react/dist/esm/icons/x";

import JobDetailPanel from "../components/JobDetailPanel";
import JobSearchInput from "../components/JobSearchInput";
import SaveSearchPopover from "../components/SaveSearchPopover";
import SavedSearchesSidebar from "../components/SavedSearchesSidebar";
import { JobBoardContent } from "../components/JobBoardContent";
import { JobFilters } from "../components/JobFilters";
import { JobRecommendations } from "../components/JobRecommendations";
import { useJobBoardState } from "../hooks/useJobBoardState";
import { useSavedSearches } from "../hooks/useSavedSearches";
import { Button } from "../components/ui/button";

const PAGE_TITLE = "Job Board — Pipelined";
const DEFAULT_TITLE = "Pipelined — Job Application Tracker for Students & Engineers";

function JobBoard() {
  const { filters, hasActiveFilters, jobs, total, isLoading, error, refetch, hasMore, savePopoverOpen, setSavePopoverOpen, selectedJob, setSelectedJob, handleLoadMore, handleClearFilters, handleApplySavedSearch } = useJobBoardState();
  const [savedOpen, setSavedOpen] = useState(false);
  const { data: savedSearches } = useSavedSearches();
  const savedCount = savedSearches?.length ?? 0;

  useEffect(() => {
    document.title = PAGE_TITLE;
    return () => { document.title = DEFAULT_TITLE; };
  }, []);

  const focusFirstJobRow = useCallback(() => {
    document.querySelector('[data-testid="job-list"] [data-testid="job-row"]')?.focus();
  }, []);

  return (
    <main className="flex flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold text-text-1">
            Job board
            {!isLoading && total > 0 && (
              <span className="ml-2 text-base font-normal text-text-3">
                · {total.toLocaleString()} job{total !== 1 ? "s" : ""}
              </span>
            )}
          </h1>
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
          <JobSearchInput onEnterKey={focusFirstJobRow} />
          <JobFilters />
          {hasActiveFilters && (
            <div className="relative shrink-0">
              <Button type="button" variant="outline" aria-label="Save this search" onClick={() => setSavePopoverOpen((v) => !v)} className="flex items-center gap-1.5">
                <Bookmark className="h-4 w-4" aria-hidden="true" />
                Save this search
              </Button>
              {savePopoverOpen && <SaveSearchPopover currentFilters={filters} onClose={() => setSavePopoverOpen(false)} />}
            </div>
          )}
        </div>
        <div className="relative lg:hidden">
          <Button type="button" variant="ghost" size="sm" className="flex items-center gap-1.5" onClick={() => setSavedOpen(true)}>Saved searches</Button>
          {savedCount > 0 && (
            <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {savedCount}
            </span>
          )}
        </div>
      </div>
      {savedOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSavedOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="saved-searches-heading" className="absolute inset-y-0 left-0 w-72 bg-card border-r border-border p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span id="saved-searches-heading" className="font-medium text-sm text-foreground">Saved searches</span>
              <Button type="button" variant="ghost" size="icon" aria-label="Close saved searches" onClick={() => setSavedOpen(false)}>
                <XIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <SavedSearchesSidebar onApply={(s) => { handleApplySavedSearch(s); setSavedOpen(false); }} />
          </div>
        </div>
      )}
      <div className="flex gap-6">
        {savedCount > 0 && (
          <aside className="hidden w-56 shrink-0 lg:block">
            <SavedSearchesSidebar onApply={handleApplySavedSearch} />
          </aside>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {!hasActiveFilters && <JobRecommendations onSelectJob={setSelectedJob} />}
          <JobBoardContent isLoading={isLoading} error={error} jobs={jobs} total={total} hasFilters={hasActiveFilters} hasMore={hasMore} onClearFilters={handleClearFilters} onLoadMore={handleLoadMore} onSelectJob={setSelectedJob} refetch={refetch} selectedJobId={selectedJob?.id ?? null} />
        </div>
      </div>
      {selectedJob && <JobDetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </main>
  );
}

export default JobBoard;
