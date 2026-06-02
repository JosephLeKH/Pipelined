/** Filter state, pagination, job data, and handlers for the JobBoard page. */

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { useJobsInfinite } from "../hooks/useJobs";

const DEFAULT_SORT = "best_match";

function buildSavedSearchParams(savedSearch) {
  const next = new URLSearchParams();
  if (savedSearch.query) next.set("q", savedSearch.query);
  const f = savedSearch.filters ?? {};
  if (f.role_type) next.set("role_type", f.role_type);
  if (f.experience_level) next.set("experience_level", f.experience_level);
  if (f.remote_status) next.set("remote_status", f.remote_status);
  if (f.company_type) next.set("company_type", f.company_type);
  if (f.date_from) next.set("date_from", f.date_from);
  // Legacy docs may have written `min_salary`; new schema uses `salary_min`.
  const salaryMin = f.salary_min ?? f.min_salary;
  if (salaryMin != null) next.set("salary_min", String(salaryMin));
  if (f.salary_max != null) next.set("salary_max", String(f.salary_max));
  if (f.sort && f.sort !== DEFAULT_SORT) next.set("sort", f.sort);
  return next;
}

export function useJobBoardState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedJob, setSelectedJob] = useState(null);
  const [savePopoverOpen, setSavePopoverOpen] = useState(false);

  const q = searchParams.get("q") ?? undefined;
  const roleType = searchParams.get("role_type") ?? undefined;
  const experienceLevel = searchParams.get("experience_level") ?? undefined;
  const remoteStatus = searchParams.get("remote_status") ?? undefined;
  const companyType = searchParams.get("company_type") ?? undefined;
  const salaryMin = searchParams.get("salary_min") ? Number(searchParams.get("salary_min")) : undefined;
  const salaryMax = searchParams.get("salary_max") ? Number(searchParams.get("salary_max")) : undefined;
  const dateFrom = searchParams.get("date_from") ?? undefined;
  const sort = searchParams.get("sort") ?? DEFAULT_SORT;

  // Sort is presentation, not a filter — changing it shouldn't toggle the
  // "Save this search" CTA or hide the recommendations carousel.
  const hasActiveFilters = Boolean(
    q || roleType || experienceLevel || remoteStatus || companyType || salaryMin || salaryMax || dateFrom
  );

  const filters = useMemo(() => {
    const f = {};
    if (q) f.q = q;
    if (roleType) f.role_type = roleType;
    if (experienceLevel) f.experience_level = experienceLevel;
    if (remoteStatus) f.remote_status = remoteStatus;
    if (companyType) f.company_type = companyType;
    if (salaryMin !== undefined) f.salary_min = salaryMin;
    if (salaryMax !== undefined) f.salary_max = salaryMax;
    if (dateFrom) f.date_from = dateFrom;
    // best_match is the implicit server default — only forward explicit sorts.
    if (sort && sort !== DEFAULT_SORT) f.sort = sort;
    return f;
  }, [q, roleType, experienceLevel, remoteStatus, companyType, salaryMin, salaryMax, dateFrom, sort]);

  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useJobsInfinite(filters);
  const jobs = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p?.data ?? []),
    [data],
  );
  const total = data?.pages?.[0]?.meta?.total ?? 0;
  const hasMore = Boolean(hasNextPage);

  const handleLoadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  const handleClearFilters = useCallback(() => setSearchParams(new URLSearchParams(), { replace: true }), [setSearchParams]);
  const handleApplySavedSearch = useCallback((s) => setSearchParams(buildSavedSearchParams(s), { replace: true }), [setSearchParams]);

  return { filters, hasActiveFilters, jobs, total, isLoading, error, refetch, hasMore, savePopoverOpen, setSavePopoverOpen, selectedJob, setSelectedJob, handleLoadMore, handleClearFilters, handleApplySavedSearch };
}
