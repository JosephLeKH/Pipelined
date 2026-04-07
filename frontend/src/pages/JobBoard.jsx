/** Job board page: browse curated listings in card grid or compact list view. */

import { useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { FixedSizeList } from "react-window";

import LayoutGrid from "lucide-react/dist/esm/icons/layout-grid";
import List from "lucide-react/dist/esm/icons/list";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import SearchIcon from "lucide-react/dist/esm/icons/search";

import ApiErrorMessage from "../components/ApiErrorMessage";
import JobCard from "../components/JobCard";
import JobRow from "../components/JobRow";
import { useJobs } from "../hooks/useJobs";
import {
  ROLE_TYPE_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  REMOTE_STATUS_OPTIONS,
  COMPANY_TYPE_OPTIONS,
} from "../lib/constants";

const DEFAULT_VIEW = "grid";
const ROW_HEIGHT = 72;
const LIST_HEIGHT = 600;
const DEFAULT_PER_PAGE = 30;
const SEARCH_DEBOUNCE_MS = 300;

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

function SelectFilter({ label, paramKey, options }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(paramKey) ?? "";

  const handleChange = useCallback(
    (e) => {
      const next = new URLSearchParams(searchParams);
      if (e.target.value) {
        next.set(paramKey, e.target.value);
      } else {
        next.delete(paramKey);
      }
      next.set("page", "1");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, paramKey]
  );

  return (
    <label className="flex flex-col gap-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
      {label}
      <select
        value={value}
        onChange={handleChange}
        className="mt-0.5 rounded border border-gray-300 px-2 py-1.5 text-sm font-normal capitalize text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        aria-label={label}
      >
        <option value="">Any</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function JobFilters() {
  return (
    <div className="flex flex-wrap gap-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
      <SelectFilter label="Role Type" paramKey="role_type" options={ROLE_TYPE_OPTIONS} />
      <SelectFilter
        label="Experience"
        paramKey="experience_level"
        options={EXPERIENCE_LEVEL_OPTIONS}
      />
      <SelectFilter
        label="Remote"
        paramKey="remote_status"
        options={REMOTE_STATUS_OPTIONS}
      />
      <SelectFilter
        label="Company Type"
        paramKey="company_type"
        options={COMPANY_TYPE_OPTIONS}
      />
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

function JobBoard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState(DEFAULT_VIEW);

  const q = searchParams.get("q") ?? undefined;
  const roleType = searchParams.get("role_type") ?? undefined;
  const experienceLevel = searchParams.get("experience_level") ?? undefined;
  const remoteStatus = searchParams.get("remote_status") ?? undefined;
  const companyType = searchParams.get("company_type") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");

  const filters = useMemo(() => {
    const f = { page, per_page: DEFAULT_PER_PAGE };
    if (q) f.q = q;
    if (roleType) f.role_type = roleType;
    if (experienceLevel) f.experience_level = experienceLevel;
    if (remoteStatus) f.remote_status = remoteStatus;
    if (companyType) f.company_type = companyType;
    return f;
  }, [q, roleType, experienceLevel, remoteStatus, companyType, page]);

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

      <JobSearchInput />
      <JobFilters />

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
