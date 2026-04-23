/** Job board page: curated marketplace with rich cards and slide-in detail panel. */

import { useEffect } from "react";

import Bookmark from "lucide-react/dist/esm/icons/bookmark";

import JobDetailPanel from "../components/JobDetailPanel";
import JobSearchInput from "../components/JobSearchInput";
import SaveSearchPopover from "../components/SaveSearchPopover";
import SavedSearchesSidebar from "../components/SavedSearchesSidebar";
import { JobBoardContent } from "../components/JobBoardContent";
import { JobFilters } from "../components/JobFilters";
import { useJobBoardState } from "../hooks/useJobBoardState";

const PAGE_TITLE = "Job Board — Pipelined";
const DEFAULT_TITLE = "Pipelined — Job Application Tracker for Students & Engineers";

function JobBoard() {
  const { filters, hasActiveFilters, jobs, total, isLoading, error, refetch, hasMore, savePopoverOpen, setSavePopoverOpen, selectedJob, setSelectedJob, handleLoadMore, handleClearFilters, handleApplySavedSearch } = useJobBoardState();

  useEffect(() => {
    document.title = PAGE_TITLE;
    return () => { document.title = DEFAULT_TITLE; };
  }, []);

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-gray-50 px-4 py-6 dark:bg-gray-900 sm:px-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex-1"><JobSearchInput /></div>
          {hasActiveFilters && (
            <div className="relative shrink-0">
              <button type="button" aria-label="Save this search" onClick={() => setSavePopoverOpen((v) => !v)} className="flex items-center gap-1.5 rounded-button border border-brand-300 bg-brand-50 px-3 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                <Bookmark className="h-4 w-4" />
                Save this search
              </button>
              {savePopoverOpen && <SaveSearchPopover currentFilters={filters} onClose={() => setSavePopoverOpen(false)} />}
            </div>
          )}
        </div>
        <JobFilters />
      </div>
      <div className="flex gap-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <SavedSearchesSidebar onApply={handleApplySavedSearch} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <JobBoardContent isLoading={isLoading} error={error} jobs={jobs} total={total} hasFilters={hasActiveFilters} hasMore={hasMore} onClearFilters={handleClearFilters} onLoadMore={handleLoadMore} onSelectJob={setSelectedJob} refetch={refetch} />
        </div>
      </div>
      {selectedJob && <JobDetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </main>
  );
}

export default JobBoard;
