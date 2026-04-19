/** Filter state, pagination, job data, and handlers for the JobBoard page. */

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { useJobs } from "../hooks/useJobs";

const DEFAULT_PER_PAGE = 30;

function buildSavedSearchParams(savedSearch) {
  const next = new URLSearchParams();
  if (savedSearch.query) next.set("q", savedSearch.query);
  const f = savedSearch.filters ?? {};
  if (f.role_type) next.set("role_type", f.role_type);
  if (f.experience_level) next.set("experience_level", f.experience_level);
  if (f.remote_status) next.set("remote_status", f.remote_status);
  if (f.company_type) next.set("company_type", f.company_type);
  if (f.min_salary != null) next.set("salary_min", String(f.min_salary));
  return next;
}

export function useJobBoardState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedJob, setSelectedJob] = useState(null);
  const [savePopoverOpen, setSavePopoverOpen] = useState(false);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  const q = searchParams.get("q") ?? undefined;
  const roleType = searchParams.get("role_type") ?? undefined;
  const experienceLevel = searchParams.get("experience_level") ?? undefined;
  const remoteStatus = searchParams.get("remote_status") ?? undefined;
  const companyType = searchParams.get("company_type") ?? undefined;
  const salaryMin = searchParams.get("salary_min") ? Number(searchParams.get("salary_min")) : undefined;
  const salaryMax = searchParams.get("salary_max") ? Number(searchParams.get("salary_max")) : undefined;

  const hasActiveFilters = Boolean(q || roleType || experienceLevel || remoteStatus || companyType || salaryMin || salaryMax);
  const filterKey = [q, roleType, experienceLevel, remoteStatus, companyType, salaryMin, salaryMax].join("|||");

  useEffect(() => { setPerPage(DEFAULT_PER_PAGE); }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const filters = useMemo(() => {
    const f = { page: 1, per_page: perPage };
    if (q) f.q = q;
    if (roleType) f.role_type = roleType;
    if (experienceLevel) f.experience_level = experienceLevel;
    if (remoteStatus) f.remote_status = remoteStatus;
    if (companyType) f.company_type = companyType;
    if (salaryMin !== undefined) f.salary_min = salaryMin;
    if (salaryMax !== undefined) f.salary_max = salaryMax;
    return f;
  }, [q, roleType, experienceLevel, remoteStatus, companyType, salaryMin, salaryMax, perPage]);

  const { data: envelope, isLoading, error, refetch } = useJobs(filters);
  const jobs = envelope?.data ?? [];
  const total = envelope?.meta?.total ?? 0;
  const hasMore = !isLoading && jobs.length < total;

  const handleLoadMore = useCallback(() => setPerPage((p) => p + DEFAULT_PER_PAGE), []);
  const handleClearFilters = useCallback(() => setSearchParams(new URLSearchParams(), { replace: true }), [setSearchParams]);
  const handleApplySavedSearch = useCallback((s) => setSearchParams(buildSavedSearchParams(s), { replace: true }), [setSearchParams]);

  return { filters, hasActiveFilters, jobs, total, isLoading, error, refetch, hasMore, savePopoverOpen, setSavePopoverOpen, selectedJob, setSelectedJob, handleLoadMore, handleClearFilters, handleApplySavedSearch };
}
