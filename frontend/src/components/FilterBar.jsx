/** Filter controls for the application pipeline: stage, company type, remote status, date range, archive toggle, search. */

import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SearchIcon from "lucide-react/dist/esm/icons/search";
import { trackEvent } from "../lib/analytics";

const SEARCH_DEBOUNCE_MS = 300;

import { STAGE_COLORS } from "../lib/constants";

const STAGE_OPTIONS = Object.keys(STAGE_COLORS);
const COMPANY_TYPE_OPTIONS = ["startup", "mid", "enterprise", "gov", "nonprofit", "other"];
const REMOTE_STATUS_OPTIONS = ["remote", "hybrid", "onsite", "unknown"];

function CheckboxGroup({ label, groupKey, options, selected, onChange }) {
  return (
    <fieldset className="flex shrink-0 flex-col gap-1">
      <legend className="mb-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</legend>
      {options.map((opt) => {
        const inputId = `filter-${groupKey}-${opt}`;
        return (
          <label key={opt} htmlFor={inputId} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              id={inputId}
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange([...selected, opt]);
                } else {
                  onChange(selected.filter((s) => s !== opt));
                }
              }}
            />
            {opt}
          </label>
        );
      })}
    </fieldset>
  );
}

function FilterBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef(null);

  const stages = searchParams.getAll("stage");
  const companyTypes = searchParams.getAll("company_type");
  const remoteStatuses = searchParams.getAll("remote_status");
  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const includeArchived = searchParams.get("include_archived") === "true";

  const updateFilter = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);
      next.delete(key);
      if (Array.isArray(value)) {
        value.forEach((v) => next.append(key, v));
      } else if (value) {
        next.set(key, value);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handleSearchChange = useCallback(
    (e) => {
      const val = e.target.value;
      setSearchValue(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateFilter("q", val);
        if (val.trim()) {
          trackEvent("search_performed", { type: "applications", query_length: val.trim().length });
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    [updateFilter]
  );

  const toggleArchived = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    if (includeArchived) {
      next.delete("include_archived");
    } else {
      next.set("include_archived", "true");
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, includeArchived]);

  return (
    <div className="flex flex-col gap-3">
      {includeArchived && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300"
        >
          <span className="font-medium">Viewing archived applications.</span>
          <span>Uncheck &ldquo;Show archived&rdquo; to return to active view.</span>
        </div>
      )}
      <div className="flex gap-6 overflow-x-auto rounded-card bg-white p-4 shadow-card border border-slate-200/60 dark:bg-slate-800 dark:border-slate-700 md:flex-wrap">
        <fieldset className="flex shrink-0 flex-col gap-1">
          <legend className="mb-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Search</legend>
          <div className="relative flex items-center">
            <SearchIcon className="absolute left-2 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              aria-label="search applications"
              value={searchValue}
              onChange={handleSearchChange}
              placeholder="Title, company, notes..."
              className="border border-slate-300 bg-white rounded-input pl-8 pr-2 py-1.5 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        </fieldset>
        <CheckboxGroup
          label="Stage"
          groupKey="stage"
          options={STAGE_OPTIONS}
          selected={stages}
          onChange={(val) => updateFilter("stage", val)}
        />
        <CheckboxGroup
          label="Company Type"
          groupKey="company-type"
          options={COMPANY_TYPE_OPTIONS}
          selected={companyTypes}
          onChange={(val) => updateFilter("company_type", val)}
        />
        <CheckboxGroup
          label="Remote Status"
          groupKey="remote-status"
          options={REMOTE_STATUS_OPTIONS}
          selected={remoteStatuses}
          onChange={(val) => updateFilter("remote_status", val)}
        />
        <fieldset className="flex shrink-0 flex-col gap-1">
          <legend className="mb-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Date Range</legend>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            From
            <input
              type="date"
              value={dateFrom}
              aria-label="date from"
              onChange={(e) => updateFilter("date_from", e.target.value)}
              className="border border-slate-300 bg-white rounded-input px-2 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            To
            <input
              type="date"
              value={dateTo}
              aria-label="date to"
              onChange={(e) => updateFilter("date_to", e.target.value)}
              className="border border-slate-300 bg-white rounded-input px-2 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            />
          </label>
        </fieldset>
        <fieldset className="flex shrink-0 flex-col gap-1">
          <legend className="mb-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Archive</legend>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              aria-label="Show archived"
              checked={includeArchived}
              onChange={toggleArchived}
            />
            Show archived
          </label>
        </fieldset>
      </div>
    </div>
  );
}

export default FilterBar;
