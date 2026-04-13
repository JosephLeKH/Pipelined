/** Job board page: curated marketplace with rich cards and slide-in detail panel. */

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import Search from "lucide-react/dist/esm/icons/search";

import ApiErrorMessage from "../components/ApiErrorMessage";
import JobCard from "../components/JobCard";
import JobDetailPanel from "../components/JobDetailPanel";
import JobSearchInput from "../components/JobSearchInput";
import SaveSearchPopover from "../components/SaveSearchPopover";
import SavedSearchesSidebar from "../components/SavedSearchesSidebar";
import { JobFilters } from "../components/JobFilters";
import { useJobs } from "../hooks/useJobs";
import { BUTTON_GHOST } from "../lib/designTokens";

const DEFAULT_PER_PAGE = 30;

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-52 animate-pulse rounded-card bg-slate-100 dark:bg-slate-700" />
      ))}
    </div>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <Search className="h-12 w-12 text-slate-300 dark:text-slate-600" aria-hidden="true" />
      <div>
        <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
          No jobs match your search
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Try adjusting your filters or search terms
        </p>
      </div>
      {hasFilters && (
        <button type="button" onClick={onClear} className={BUTTON_GHOST}>
          Clear Filters
        </button>
      )}
    </div>
  );
}

function JobBoard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedJob, setSelectedJob] = useState(null);
  const [savePopoverOpen, setSavePopoverOpen] = useState(false);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  const q = searchParams.get("q") ?? undefined;
  const roleType = searchParams.get("role_type") ?? undefined;
  const experienceLevel = searchParams.get("experience_level") ?? undefined;
  const remoteStatus = searchParams.get("remote_status") ?? undefined;
  const companyType = searchParams.get("company_type") ?? undefined;
  const salaryMin = searchParams.get("salary_min") ? Number(searchParams.get("salary_min")) : undefined;
  const salaryMax = searchParams.get("salary_max") ? Number(searchParams.get("salary_max")) : undefined;

  const hasActiveFilters = Boolean(
    q || roleType || experienceLevel || remoteStatus || companyType || salaryMin || salaryMax
  );

  useEffect(() => {
    document.title = "Job Board — Pipelined";
    return () => {
      document.title = "Pipelined — Job Application Tracker for Students & Engineers";
    };
  }, []);

  // Reset load-more count when filter params change
  const filterKey = [q, roleType, experienceLevel, remoteStatus, companyType, salaryMin, salaryMax].join("|||");
  useEffect(() => {
    setPerPage(DEFAULT_PER_PAGE);
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const filters = useMemo(() => {
    const f = { page: 1, per_page: perPage };
    if (q) f.q = q;
    if (roleType) f.role_type = roleType;
    if (experienceLevel) f.experience_level = experienceLevel;
    if (remoteStatus) f.remote_status = remoteStatus;
    if (companyType) f.company_type = companyType;
    if (salaryMin !== undefined) f.salary_min = salaryMin;
    if (salaryMax !== undefined) f.salary_max = salaryMax;
    return f;
  }, [q, roleType, experienceLevel, remoteStatus, companyType, salaryMin, salaryMax, perPage]);

  const { data: envelope, isLoading, error, refetch } = useJobs(filters);
  const jobs = envelope?.data ?? [];
  const total = envelope?.meta?.total ?? 0;
  const hasMore = !isLoading && jobs.length < total;

  const handleLoadMore = useCallback(() => {
    setPerPage((p) => p + DEFAULT_PER_PAGE);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const handleApplySavedSearch = useCallback(
    (savedSearch) => {
      const next = new URLSearchParams();
      if (savedSearch.query) next.set("q", savedSearch.query);
      const f = savedSearch.filters ?? {};
      if (f.role_type) next.set("role_type", f.role_type);
      if (f.experience_level) next.set("experience_level", f.experience_level);
      if (f.remote_status) next.set("remote_status", f.remote_status);
      if (f.company_type) next.set("company_type", f.company_type);
      if (f.min_salary != null) next.set("salary_min", String(f.min_salary));
      setSearchParams(next, { replace: true });
    },
    [setSearchParams]
  );

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6">
      {/* Search header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <JobSearchInput />
          </div>
          {hasActiveFilters && (
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label="Save this search"
                onClick={() => setSavePopoverOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-button border border-brand-300 bg-brand-50 px-3 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
              >
                <Bookmark className="h-4 w-4" />
                Save this search
              </button>
              {savePopoverOpen && (
                <SaveSearchPopover
                  currentFilters={filters}
                  onClose={() => setSavePopoverOpen(false)}
                />
              )}
            </div>
          )}
        </div>
        <JobFilters />
      </div>

      {/* Main layout */}
      <div className="flex gap-6">
        {/* Saved searches sidebar (hidden on mobile) */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <SavedSearchesSidebar onApply={handleApplySavedSearch} />
        </aside>

        {/* Content area */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {!isLoading && !error && total > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {jobs.length} of {total} result{total !== 1 ? "s" : ""}
            </p>
          )}

          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <ApiErrorMessage error={error} onRetry={refetch} />
          ) : jobs.length === 0 ? (
            <EmptyState hasFilters={hasActiveFilters} onClear={handleClearFilters} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} onSelect={setSelectedJob} />
              ))}
            </div>
          )}

          {hasMore && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleLoadMore}
                className="rounded-button border border-slate-300 bg-white px-6 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedJob && (
        <JobDetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </main>
  );
}

export default JobBoard;
