/** Job board page: curated marketplace with rich cards and slide-in detail panel. */

import { useEffect, useState } from "react";

import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import XIcon from "lucide-react/dist/esm/icons/x";

import JobDetailPanel from "../components/JobDetailPanel";
import JobSearchInput from "../components/JobSearchInput";
import NavBar from "../components/NavBar";
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavBar />
      <main className="flex flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-3">
        <h1 className=" text-2xl font-semibold text-foreground">Job Board</h1>
        <div className="flex items-center gap-3">
          <div className="flex-1"><JobSearchInput /></div>
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
        <JobFilters />
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
        <aside className="hidden w-56 shrink-0 lg:block">
          <SavedSearchesSidebar onApply={handleApplySavedSearch} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {!hasActiveFilters && <JobRecommendations onSelectJob={setSelectedJob} />}
          <JobBoardContent isLoading={isLoading} error={error} jobs={jobs} total={total} hasFilters={hasActiveFilters} hasMore={hasMore} onClearFilters={handleClearFilters} onLoadMore={handleLoadMore} onSelectJob={setSelectedJob} refetch={refetch} />
        </div>
      </div>
      {selectedJob && <JobDetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} />}
      </main>
    </div>
  );
}

export default JobBoard;
