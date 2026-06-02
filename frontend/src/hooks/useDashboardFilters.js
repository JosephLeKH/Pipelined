/** URL-driven filter state and navigation handlers for the Dashboard page. */

import { useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

const FILTER_KEYS = ["stage", "company_type", "remote_status", "tags", "date_from", "date_to", "include_archived", "q"];

function updateParams(searchParams, setSearchParams, fn) {
  const next = new URLSearchParams(searchParams);
  fn(next);
  setSearchParams(next, { replace: true });
}

export function useDashboardFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const stages = searchParams.getAll("stage");
  const companyTypes = searchParams.getAll("company_type");
  const remoteStatuses = searchParams.getAll("remote_status");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const includeArchived = searchParams.get("include_archived") === "true";
  const selectedId = searchParams.get("selected") ?? "";

  const filters = useMemo(() => {
    const f = {};
    if (stages.length) f.stage = stages;
    if (companyTypes.length) f.company_type = companyTypes;
    if (remoteStatuses.length) f.remote_status = remoteStatuses;
    if (dateFrom) f.date_from = dateFrom;
    if (dateTo) f.date_to = dateTo;
    if (includeArchived) f.include_archived = true;
    return f;
  }, [stages, companyTypes, remoteStatuses, dateFrom, dateTo, includeArchived]);

  const update = useCallback((fn) => updateParams(searchParams, setSearchParams, fn), [searchParams, setSearchParams]);

  const handleSelect = useCallback((app) => update((n) => n.set("selected", app.id)), [update]);
  const handleClosePanel = useCallback(() => update((n) => n.delete("selected")), [update]);
  const handleClearFilters = useCallback(() => update((n) => FILTER_KEYS.forEach((k) => n.delete(k))), [update]);
  const handleViewFollowUps = useCallback((firstAppId) => {
    update((n) => {
      if (firstAppId) {
        n.set("selected", firstAppId);
        n.set("section", "follow-up");
      } else {
        n.set("follow_up_due", "true");
      }
      n.delete("action");
    });
  }, [update]);

  return { filters, selectedId, includeArchived, handleSelect, handleClosePanel, handleClearFilters, handleViewFollowUps };
}
