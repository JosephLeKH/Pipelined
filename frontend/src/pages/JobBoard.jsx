/** Job board page: browse curated listings in card grid or compact list view. */

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { FixedSizeList } from "react-window";

import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import LayoutGrid from "lucide-react/dist/esm/icons/layout-grid";
import List from "lucide-react/dist/esm/icons/list";

import ApiErrorMessage from "../components/ApiErrorMessage";
import JobCard from "../components/JobCard";
import JobRow from "../components/JobRow";
import JobSearchInput from "../components/JobSearchInput";
import SaveSearchPopover from "../components/SaveSearchPopover";
import SavedSearchesSidebar from "../components/SavedSearchesSidebar";
import { JobFilters } from "../components/JobFilters";
import { useJobs } from "../hooks/useJobs";

const DEFAULT_VIEW = "grid";
const ROW_HEIGHT = 72;
const LIST_HEIGHT = 600;
const DEFAULT_PER_PAGE = 30;

function ViewToggle({ view, onToggle }) {
  return (
    <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <button
        type="button"
        onClick={() => onToggle("grid")}
        aria-label="Grid view"
        aria-pressed={view === "grid"}
        className={`rounded p-1.5 transition-colors ${
          view === "grid" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onToggle("list")}
        aria-label="List view"
        aria-pressed={view === "list"}
        className={`rounded p-1.5 transition-colors ${
          view === "list" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
        }`}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}


function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="rounded border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-sm text-gray-600 dark:text-gray-300">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="rounded border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function LoadingSkeleton({ view }) {
  if (view === "grid") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-52 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
      ))}
    </div>
  );
}


function JobBoard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState(DEFAULT_VIEW);
  const [savePopoverOpen, setSavePopoverOpen] = useState(false);

  const q = searchParams.get("q") ?? undefined;
  const roleType = searchParams.get("role_type") ?? undefined;
  const experienceLevel = searchParams.get("experience_level") ?? undefined;
  const remoteStatus = searchParams.get("remote_status") ?? undefined;
  const companyType = searchParams.get("company_type") ?? undefined;
  const salaryMin = searchParams.get("salary_min") ? Number(searchParams.get("salary_min")) : undefined;
  const salaryMax = searchParams.get("salary_max") ? Number(searchParams.get("salary_max")) : undefined;
  const page = Number(searchParams.get("page") ?? "1");

  const hasActiveFilters = Boolean(
    q || roleType || experienceLevel || remoteStatus || companyType || salaryMin || salaryMax
  );

  const filters = useMemo(() => {
    const f = { page, per_page: DEFAULT_PER_PAGE };
    if (q) f.q = q;
    if (roleType) f.role_type = roleType;
    if (experienceLevel) f.experience_level = experienceLevel;
    if (remoteStatus) f.remote_status = remoteStatus;
    if (companyType) f.company_type = companyType;
    if (salaryMin !== undefined) f.salary_min = salaryMin;
    if (salaryMax !== undefined) f.salary_max = salaryMax;
    return f;
  }, [q, roleType, experienceLevel, remoteStatus, companyType, salaryMin, salaryMax, page]);

  const { data: envelope, isLoading, error, refetch } = useJobs(filters);
  const jobs = envelope?.data ?? [];
  const total = envelope?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / DEFAULT_PER_PAGE);

  const handlePageChange = useCallback(
    (nextPage) => {
      const next = new URLSearchParams(searchParams);
      next.set("page", String(nextPage));
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

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
      next.set("page", "1");
      setSearchParams(next, { replace: true });
    },
    [setSearchParams]
  );

  const ListRow = useCallback(
    ({ index, style }) => <JobRow job={jobs[index]} style={style} />,
    [jobs]
  );

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-gray-50 p-6 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Job Board</h1>
          {!isLoading && (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {total} listing{total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <ViewToggle view={view} onToggle={setView} />
      </div>

      <div className="flex items-start gap-3">
        <JobSearchInput />
        {hasActiveFilters && (
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label="Save this search"
              onClick={() => setSavePopoverOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
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
      <SavedSearchesSidebar onApply={handleApplySavedSearch} />

      {isLoading ? (
        <LoadingSkeleton view={view} />
      ) : error ? (
        <ApiErrorMessage error={error} onRetry={refetch} />
      ) : jobs.length === 0 ? (
        <div className="py-20 text-center text-gray-500 dark:text-gray-400">
          No listings match your filters.
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <FixedSizeList
            height={LIST_HEIGHT}
            itemCount={jobs.length}
            itemSize={ROW_HEIGHT}
            width="100%"
          >
            {ListRow}
          </FixedSizeList>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
    </main>
  );
}

export default JobBoard;
