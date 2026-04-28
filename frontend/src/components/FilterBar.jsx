/** Filter controls for the application pipeline: stage, company type, remote status, date range, archive toggle, search. */

import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SearchIcon from "lucide-react/dist/esm/icons/search";
import { trackEvent } from "../lib/analytics";
import { useTags } from "../hooks/useApplications";
import { INPUT_BASE } from "../lib/designTokens";

import { STAGE_COLORS, SEARCH_DEBOUNCE_MS, COMPANY_TYPE_OPTIONS, REMOTE_STATUS_OPTIONS } from "../lib/constants";

const STAGE_OPTIONS = Object.keys(STAGE_COLORS);

function CheckboxGroup({ label, groupKey, options, selected, onChange }) {
  return (
    <fieldset className="flex shrink-0 flex-col gap-1">
      <legend className="mb-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{label}</legend>
      {options.map((opt) => {
        const inputId = `filter-${groupKey}-${opt}`;
        return (
          <label key={opt} htmlFor={inputId} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              id={inputId}
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={(e) => {
                if (e.target.checked) { onChange([...selected, opt]); } else { onChange(selected.filter((s) => s !== opt)); }
              }}
            />
            {opt}
          </label>
        );
      })}
    </fieldset>
  );
}

function ArchivedBanner() {
  return (
    <div role="status" className="flex items-center gap-2 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300">
      <span className="font-medium">Viewing archived applications.</span>
      <span>Uncheck &ldquo;Show archived&rdquo; to return to active view.</span>
    </div>
  );
}

function SearchFieldset({ searchValue, onSearchChange }) {
  return (
    <fieldset className="flex shrink-0 flex-col gap-1">
      <legend className="mb-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Search</legend>
      <div className="relative flex items-center">
        <SearchIcon className="absolute left-2 h-4 w-4 text-gray-500" aria-hidden="true" />
        <input
          type="text"
          aria-label="search applications"
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Title, company, notes..."
          className={`${INPUT_BASE} pl-8 pr-2`}
        />
      </div>
    </fieldset>
  );
}

function DateRangeFilter({ dateFrom, dateTo, onUpdate }) {
  return (
    <fieldset className="flex shrink-0 flex-col gap-1">
      <legend className="mb-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Date Range</legend>
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        From
        <input type="date" value={dateFrom} aria-label="date from" onChange={(e) => onUpdate("date_from", e.target.value)} className={`${INPUT_BASE} px-2`} />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        To
        <input type="date" value={dateTo} aria-label="date to" onChange={(e) => onUpdate("date_to", e.target.value)} className={`${INPUT_BASE} px-2`} />
      </label>
    </fieldset>
  );
}

function ArchiveFieldset({ includeArchived, onToggle }) {
  return (
    <fieldset className="flex shrink-0 flex-col gap-1">
      <legend className="mb-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Archive</legend>
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" aria-label="Show archived" checked={includeArchived} onChange={onToggle} />
        Show archived
      </label>
    </fieldset>
  );
}

function useFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef(null);
  const stages = searchParams.getAll("stage");
  const companyTypes = searchParams.getAll("company_type");
  const remoteStatuses = searchParams.getAll("remote_status");
  const selectedTags = searchParams.getAll("tags");
  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const includeArchived = searchParams.get("include_archived") === "true";
  const updateFilter = useCallback((key, value) => {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    if (Array.isArray(value)) { value.forEach((v) => next.append(key, v)); } else if (value) { next.set(key, value); }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateFilter("q", val);
      if (val.trim()) { trackEvent("search_performed", { type: "applications", query_length: val.trim().length }); }
    }, SEARCH_DEBOUNCE_MS);
  }, [updateFilter]);
  const toggleArchived = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    if (includeArchived) { next.delete("include_archived"); } else { next.set("include_archived", "true"); }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, includeArchived]);
  return { stages, companyTypes, remoteStatuses, selectedTags, dateFrom, dateTo, includeArchived, searchValue, handleSearchChange, updateFilter, toggleArchived };
}

function FilterBar() {
  const { data: tagsData } = useTags();
  const { stages, companyTypes, remoteStatuses, selectedTags, dateFrom, dateTo,
    includeArchived, searchValue, handleSearchChange, updateFilter, toggleArchived } = useFilterParams();

  const activeFilterCount = stages.length + companyTypes.length + remoteStatuses.length + selectedTags.length
    + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (includeArchived ? 1 : 0) + (searchValue.trim() ? 1 : 0);
  const filterSummary = activeFilterCount === 0
    ? "No filters active"
    : `${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""} active`;

  return (
    <div role="region" aria-label="Filter Controls" className="flex flex-col gap-3">
      <span className="sr-only" aria-live="polite" aria-atomic="true">{filterSummary}</span>
      {includeArchived && <ArchivedBanner />}
      <div className="flex gap-6 overflow-x-auto rounded-card bg-white p-4 shadow-card border border-gray-200/60 dark:bg-gray-800 dark:border-gray-700 md:flex-wrap">
        <SearchFieldset searchValue={searchValue} onSearchChange={handleSearchChange} />
        <CheckboxGroup label="Stage" groupKey="stage" options={STAGE_OPTIONS} selected={stages} onChange={(val) => updateFilter("stage", val)} />
        <CheckboxGroup label="Company Type" groupKey="company-type" options={COMPANY_TYPE_OPTIONS} selected={companyTypes} onChange={(val) => updateFilter("company_type", val)} />
        <CheckboxGroup label="Remote Status" groupKey="remote-status" options={REMOTE_STATUS_OPTIONS} selected={remoteStatuses} onChange={(val) => updateFilter("remote_status", val)} />
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onUpdate={updateFilter} />
        {tagsData?.tags?.length > 0 && (
          <CheckboxGroup label="Tags" groupKey="tags" options={tagsData.tags.map((t) => t.name)} selected={selectedTags} onChange={(val) => updateFilter("tags", val)} />
        )}
        <ArchiveFieldset includeArchived={includeArchived} onToggle={toggleArchived} />
      </div>
    </div>
  );
}

export default FilterBar;
