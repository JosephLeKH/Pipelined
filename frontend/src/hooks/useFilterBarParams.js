/** URL-driven filter state for FilterBar. */

import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { trackEvent } from "../lib/analytics";
import { SEARCH_DEBOUNCE_MS } from "../lib/constants";

export const DATE_PRESET_DAYS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export const DATE_PRESET_OPTIONS = [
  { id: "any", label: "Any time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

export function isoDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function detectDatePreset(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return "any";
  const today = new Date().toISOString().slice(0, 10);
  if (dateTo && dateTo !== today) return "custom";
  for (const [id, days] of Object.entries(DATE_PRESET_DAYS)) {
    if (dateFrom === isoDateDaysAgo(days)) return id;
  }
  return "custom";
}

export function datePresetLabel(presetId) {
  return DATE_PRESET_OPTIONS.find((o) => o.id === presetId)?.label ?? "Custom";
}

export function useFilterBarParams() {
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

  const toggleMulti = useCallback(
    (key, opt, checked) => {
      const current = searchParams.getAll(key);
      const next = checked ? [...current, opt] : current.filter((s) => s !== opt);
      updateFilter(key, next);
    },
    [searchParams, updateFilter]
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

  const applyDatePreset = useCallback(
    (presetId) => {
      const next = new URLSearchParams(searchParams);
      next.delete("date_from");
      next.delete("date_to");
      if (presetId !== "any") {
        const days = DATE_PRESET_DAYS[presetId];
        next.set("date_from", isoDateDaysAgo(days));
        next.set("date_to", new Date().toISOString().slice(0, 10));
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const toggleArchived = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    if (includeArchived) next.delete("include_archived");
    else next.set("include_archived", "true");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, includeArchived]);

  const clearAll = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    [
      "stage",
      "company_type",
      "remote_status",
      "tags",
      "date_from",
      "date_to",
      "include_archived",
      "q",
    ].forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
    setSearchValue("");
  }, [searchParams, setSearchParams]);

  const currentFilters = {
    stage: stages.length ? stages : undefined,
    company_type: companyTypes.length ? companyTypes : undefined,
    remote_status: remoteStatuses.length ? remoteStatuses : undefined,
    tags: selectedTags.length ? selectedTags : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    include_archived: includeArchived || undefined,
    q: searchValue.trim() || undefined,
  };

  const activeFilterCount =
    stages.length +
    companyTypes.length +
    remoteStatuses.length +
    selectedTags.length +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (includeArchived ? 1 : 0) +
    (searchValue.trim() ? 1 : 0);

  return {
    stages,
    companyTypes,
    remoteStatuses,
    selectedTags,
    includeArchived,
    searchValue,
    handleSearchChange,
    toggleMulti,
    applyDatePreset,
    toggleArchived,
    clearAll,
    currentFilters,
    activeFilterCount,
    datePreset: detectDatePreset(dateFrom, dateTo),
  };
}
