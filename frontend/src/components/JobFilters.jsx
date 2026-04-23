/** Job board filter bar: horizontal scrollable filter chips. */

import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import {
  ROLE_TYPE_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  REMOTE_STATUS_OPTIONS,
  COMPANY_TYPE_OPTIONS,
} from "../lib/constants";

const FILTER_GROUPS = [
  { label: "Role", paramKey: "role_type", options: ROLE_TYPE_OPTIONS },
  { label: "Experience", paramKey: "experience_level", options: EXPERIENCE_LEVEL_OPTIONS },
  { label: "Remote", paramKey: "remote_status", options: REMOTE_STATUS_OPTIONS },
  { label: "Company", paramKey: "company_type", options: COMPANY_TYPE_OPTIONS },
];

function FilterChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
        active
          ? "bg-brand-500 text-white"
          : "bg-surface-secondary text-gray-600 hover:bg-surface-tertiary"
      }`}
    >
      {label.replace(/_/g, " ")}
    </button>
  );
}

export function JobFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const toggleFilter = useCallback(
    (paramKey, value) => {
      const next = new URLSearchParams(searchParams);
      if (searchParams.get(paramKey) === value) {
        next.delete(paramKey);
      } else {
        next.set(paramKey, value);
      }
      next.set("page", "1");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-1"
      aria-label="Filter chips"
    >
      {FILTER_GROUPS.map(({ label: groupLabel, paramKey, options }) => (
        <div key={paramKey} className="flex shrink-0 items-center gap-1.5">
          <span className="shrink-0 text-xs font-medium text-gray-400">{groupLabel}:</span>
          {options.map((opt) => (
            <FilterChip
              key={opt}
              label={opt}
              active={searchParams.get(paramKey) === opt}
              onClick={() => toggleFilter(paramKey, opt)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
