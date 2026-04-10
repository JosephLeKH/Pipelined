/** Job board page: browse curated listings in card grid or compact list view. */

import { useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { FixedSizeList } from "react-window";
import { toast } from "sonner";

import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import LayoutGrid from "lucide-react/dist/esm/icons/layout-grid";
import List from "lucide-react/dist/esm/icons/list";
import SearchIcon from "lucide-react/dist/esm/icons/search";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";

import ApiErrorMessage from "../components/ApiErrorMessage";
import JobCard from "../components/JobCard";
import { JobFilters } from "../components/JobFilters";
import JobRow from "../components/JobRow";
import { useJobs } from "../hooks/useJobs";
import {
  useCreateSavedSearch,
  useDeleteSavedSearch,
  useSavedSearches,
} from "../hooks/useSavedSearches";

const DEFAULT_VIEW = "grid";
const ROW_HEIGHT = 72;
const LIST_HEIGHT = 600;
const DEFAULT_PER_PAGE = 30;
const SEARCH_DEBOUNCE_MS = 300;
const MAX_SAVE_NAME_LENGTH = 100;

function JobSearchInput() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef(null);

  const handleChange = useCallback(
    (e) => {
      const val = e.target.value;
      setSearchValue(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const next = new URLSearchParams(searchParams);
        if (val) {
          next.set("q", val);
        } else {
          next.delete("q");
        }
        next.set("page", "1");
        setSearchParams(next, { replace: true });
      }, SEARCH_DEBOUNCE_MS);
    },
    [searchParams, setSearchParams]
  );

  return (
    <div className="flex items-center rounded-lg bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
      <div className="relative flex items-center">
        <SearchIcon className="absolute left-2 h-4 w-4 text-gray-400" aria-hidden="true" />
        <input
          type="text"
          aria-label="search jobs"
          value={searchValue}
          onChange={handleChange}
          placeholder="Role, company, description..."
          className="rounded border border-gray-300 pl-8 pr-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400"
        />
      </div>
    </div>
  );
}

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

function SaveSearchPopover({ currentFilters, onClose }) {
  const [name, setName] = useState("");
  const createMutation = useCreateSavedSearch();

  function handleSave() {
    if (!name.trim()) return;
    const { page: _p, per_page: _pp, q, ...filterFields } = currentFilters;
    createMutation.mutate(
      { name: name.trim(), query: q ?? "", filters: filterFields },
      {
        onSuccess: () => {
          toast.success(`Saved search "${name.trim()}"`);
          onClose();
        },
        onError: (err) => {
          const msg = err?.response?.data?.detail ?? "Failed to save search.";
          toast.error(msg);
        },
      }
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Save this search"
      className="absolute right-0 top-10 z-30 w-64 rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800"
    >
      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Name this search</p>
      <input
        type="text"
        aria-label="Saved search name"
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, MAX_SAVE_NAME_LENGTH))}
        placeholder="e.g. SWE Intern Remote"
        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        autoFocus
      />
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || createMutation.isPending}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function SavedSearchesSidebar({ onApply }) {
  const { data: searches = [] } = useSavedSearches();
  const deleteMutation = useDeleteSavedSearch();

  if (searches.length === 0) return null;

  function handleDelete(e, id) {
    e.stopPropagation();
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Saved search deleted"),
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Saved Searches</h2>
      <ul className="flex flex-col gap-1" aria-label="Saved searches list">
        {searches.map((s) => (
          <li
            key={s.id}
            className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => onApply(s)}
          >
            <div className="flex flex-col">
              <span className="font-medium text-gray-800 dark:text-gray-200">{s.name}</span>
              {s.query && (
                <span className="text-xs text-gray-500 dark:text-gray-400">"{s.query}"</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {s.new_matches_count > 0 && (
                <span
                  className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  aria-label={`${s.new_matches_count} new matches`}
                >
                  {s.new_matches_count}
                </span>
              )}
              <button
                type="button"
                aria-label="Delete saved search"
                onClick={(e) => handleDelete(e, s.id)}
                className="rounded p-0.5 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
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
