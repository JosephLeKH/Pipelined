/** React Query hooks for job listings data. */

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { fetchJob, fetchJobs, fetchRecommendedJobs } from "../api/jobs";
import { QUERY_STALE_TIME_MS } from "../lib/constants";

export const JOBS_PAGE_SIZE = 30;

/** Centralized query key factory. */
export const KEYS = {
  all: ["jobs"],
  lists: () => [...KEYS.all, "list"],
  list: (filters) => [...KEYS.lists(), filters],
  infinite: (filters) => [...KEYS.lists(), "infinite", filters],
  details: () => [...KEYS.all, "detail"],
  detail: (id) => [...KEYS.details(), id],
  recommended: ["jobs", "recommended"],
};

/** List job listings with optional filters/pagination. */
export function useJobs(filters = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: () => fetchJobs(filters),
    staleTime: QUERY_STALE_TIME_MS,
  });
}

/**
 * Paginated job listings via sequential page fetches.
 * Backend caps per_page at MAX_PAGE_SIZE=100; we keep per_page fixed and
 * accumulate pages so "Load more" stays within the cap indefinitely.
 */
export function useJobsInfinite(filters = {}) {
  return useInfiniteQuery({
    queryKey: KEYS.infinite(filters),
    queryFn: ({ pageParam }) =>
      fetchJobs({ ...filters, page: pageParam, per_page: JOBS_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.meta?.total ?? 0;
      const loaded = allPages.reduce((sum, p) => sum + (p?.data?.length ?? 0), 0);
      return loaded < total ? allPages.length + 1 : undefined;
    },
    staleTime: QUERY_STALE_TIME_MS,
  });
}

/** Fetch a single job listing by id. */
export function useJob(id) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => fetchJob(id),
    enabled: Boolean(id),
    staleTime: QUERY_STALE_TIME_MS,
  });
}

/** Fetch personalized job recommendations for the authenticated user. */
export function useRecommendedJobs(enabled = true) {
  return useQuery({
    queryKey: KEYS.recommended,
    queryFn: fetchRecommendedJobs,
    enabled,
    staleTime: QUERY_STALE_TIME_MS,
  });
}
