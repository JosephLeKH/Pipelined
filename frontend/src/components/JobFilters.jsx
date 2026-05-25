/** Job board inline filter row — Linear-style single-select dropdowns (PRD-06 §5). */

import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { SingleSelectFilterDropdown } from "./FilterBarDropdown";
import {
  ROLE_TYPE_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  REMOTE_STATUS_OPTIONS,
  JOB_POSTED_FILTER_OPTIONS,
  JOB_SORT_OPTIONS,
} from "../lib/constants";
import { DATE_PRESET_DAYS, isoDateDaysAgo } from "../hooks/useFilterBarParams";

const REMOTE_FILTER_OPTIONS = REMOTE_STATUS_OPTIONS.filter((o) => o !== "unknown");

function formatOptionLabel(value) {
  return value.replace(/_/g, " ");
}

function detectPostedPreset(dateFrom) {
  if (!dateFrom) return "any";
  for (const [id, days] of Object.entries(DATE_PRESET_DAYS)) {
    if (dateFrom === isoDateDaysAgo(days)) return id;
  }
  return "any";
}

function postedLabel(presetId) {
  return JOB_POSTED_FILTER_OPTIONS.find((o) => o.id === presetId)?.label ?? "Any";
}

function sortLabel(sortId) {
  return JOB_SORT_OPTIONS.find((o) => o.id === sortId)?.label ?? "Best match";
}

export function JobFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const setParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);
      if (!value || value === "any") next.delete(key);
      else next.set(key, value);
      next.set("page", "1");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const applyPostedPreset = useCallback(
    (presetId) => {
      const next = new URLSearchParams(searchParams);
      next.delete("date_from");
      if (presetId !== "any") {
        next.set("date_from", isoDateDaysAgo(DATE_PRESET_DAYS[presetId]));
      }
      next.set("page", "1");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const remoteStatus = searchParams.get("remote_status") ?? "";
  const roleType = searchParams.get("role_type") ?? "";
  const experienceLevel = searchParams.get("experience_level") ?? "";
  const dateFrom = searchParams.get("date_from") ?? "";
  const sort = searchParams.get("sort") ?? "best_match";
  const postedPreset = detectPostedPreset(dateFrom);

  return (
    <div
      role="region"
      aria-label="Job filters"
      className="flex h-7 shrink-0 flex-nowrap items-center gap-1 overflow-x-auto md:overflow-visible"
    >
      <SingleSelectFilterDropdown
        label="Remote"
        displayValue={remoteStatus ? formatOptionLabel(remoteStatus) : "Any"}
      >
        <DropdownMenuLabel>Remote</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setParam("remote_status", null)}>Any</DropdownMenuItem>
        {REMOTE_FILTER_OPTIONS.map((opt) => (
          <DropdownMenuItem key={opt} onSelect={() => setParam("remote_status", opt)}>
            {formatOptionLabel(opt)}
            {remoteStatus === opt && (
              <span className="ml-auto text-[10px] text-brand-600">●</span>
            )}
          </DropdownMenuItem>
        ))}
      </SingleSelectFilterDropdown>

      <SingleSelectFilterDropdown
        label="Type"
        displayValue={roleType ? formatOptionLabel(roleType) : "Any"}
      >
        <DropdownMenuLabel>Type</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setParam("role_type", null)}>Any</DropdownMenuItem>
        {ROLE_TYPE_OPTIONS.map((opt) => (
          <DropdownMenuItem key={opt} onSelect={() => setParam("role_type", opt)}>
            {formatOptionLabel(opt)}
            {roleType === opt && (
              <span className="ml-auto text-[10px] text-brand-600">●</span>
            )}
          </DropdownMenuItem>
        ))}
      </SingleSelectFilterDropdown>

      <SingleSelectFilterDropdown
        label="Level"
        displayValue={experienceLevel ? formatOptionLabel(experienceLevel) : "Any"}
      >
        <DropdownMenuLabel>Level</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setParam("experience_level", null)}>Any</DropdownMenuItem>
        {EXPERIENCE_LEVEL_OPTIONS.map((opt) => (
          <DropdownMenuItem key={opt} onSelect={() => setParam("experience_level", opt)}>
            {formatOptionLabel(opt)}
            {experienceLevel === opt && (
              <span className="ml-auto text-[10px] text-brand-600">●</span>
            )}
          </DropdownMenuItem>
        ))}
      </SingleSelectFilterDropdown>

      <SingleSelectFilterDropdown label="Posted" displayValue={postedLabel(postedPreset)}>
        <DropdownMenuLabel>Posted</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {JOB_POSTED_FILTER_OPTIONS.map(({ id, label }) => (
          <DropdownMenuItem key={id} onSelect={() => applyPostedPreset(id)}>
            {label}
            {postedPreset === id && (
              <span className="ml-auto text-[10px] text-brand-600">●</span>
            )}
          </DropdownMenuItem>
        ))}
      </SingleSelectFilterDropdown>

      <SingleSelectFilterDropdown label="Sort" displayValue={sortLabel(sort)}>
        <DropdownMenuLabel>Sort</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {JOB_SORT_OPTIONS.map(({ id, label }) => (
          <DropdownMenuItem key={id} onSelect={() => setParam("sort", id === "best_match" ? null : id)}>
            {label}
            {sort === id && (
              <span className="ml-auto text-[10px] text-brand-600">●</span>
            )}
          </DropdownMenuItem>
        ))}
      </SingleSelectFilterDropdown>
    </div>
  );
}
