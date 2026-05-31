/** Filter state, pagination, job data, and handlers for the JobBoard page. */

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { useJobsInfinite } from "../hooks/useJobs";

function buildSavedSearchParams(savedSearch) {
  const next = new URLSearchParams();
  if (savedSearch.query) next.set("q", savedSearch.query);
  const f = savedSearch.filters ?? {};
  if (f.role_type) next.set("role_type", f.role_type);
  if (f.experience_level) next.set("experience_level", f.experience_level);
  if (f.remote_status) next.set("remote_status", f.remote_status);
  if (f.company_type) next.set("company_type", f.company_type);
  if (f.date_from) next.set("date_from", f.date_from);
  if (f.min_salary != null) next.set("salary_min", String(f.min_salary));
  return next;
}

function sortJobs(jobs, sort) {
  if (sort !== "oldest") return jobs;
  return [...jobs].sort((a, b) => {
    const da = a.date_posted ? new Date(a.date_posted).getTime() : 0;
    const db = b.date_posted ? new Date(b.date_posted).getTime() : 0;
    return da - db;
  });
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
  const sort = searchParams.get("sort") ?? "best_match";

  const hasActiveFilters = Boolean(
    q || roleType || experienceLevel || remoteStatus || companyType || salaryMin || salaryMax || dateFrom || sort !== "best_match"
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
    return f;
  }, [q, roleType, experienceLevel, remoteStatus, companyType, salaryMin, salaryMax, dateFrom]);

  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useJobsInfinite(filters);
  const rawJobs = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p?.data ?? []),
    [data],
  );
  const jobs = useMemo(() => sortJobs(rawJobs, sort), [rawJobs, sort]);
  const total = data?.pages?.[0]?.meta?.total ?? 0;
  const hasMore = Boolean(hasNextPage);

  const handleLoadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  const handleClearFilters = useCallback(() => setSearchParams(new URLSearchParams(), { replace: true }), [setSearchParams]);
  const handleApplySavedSearch = useCallback((s) => setSearchParams(buildSavedSearchParams(s), { replace: true }), [setSearchParams]);

  return { filters, hasActiveFilters, jobs, total, isLoading, error, refetch, hasMore, savePopoverOpen, setSavePopoverOpen, selectedJob, setSelectedJob, handleLoadMore, handleClearFilters, handleApplySavedSearch };
}
