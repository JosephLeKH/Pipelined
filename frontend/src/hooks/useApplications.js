/** React Query hooks for application data. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createApplication,
  deleteApplication,
  fetchApplication,
  fetchApplications,
  fetchStats,
  updateApplication,
} from "../api/applications";
import { QUERY_STALE_TIME_MS, STATS_STALE_TIME_MS } from "../lib/constants";

/** Centralized query key factory. */
export const KEYS = {
  all: ["applications"],
  lists: () => [...KEYS.all, "list"],
  list: (filters) => [...KEYS.lists(), filters],
  details: () => [...KEYS.all, "detail"],
  detail: (id) => [...KEYS.details(), id],
  stats: ["applications", "stats"],
};

/** List applications with optional filters/pagination. */
export function useApplications(filters = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: () => fetchApplications(filters),
    staleTime: QUERY_STALE_TIME_MS,
  });
}

/** Fetch a single application by id. */
export function useApplication(id) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => fetchApplication(id),
    enabled: Boolean(id),
    staleTime: QUERY_STALE_TIME_MS,
  });
}

/** Fetch pipeline stats. */
export function useApplicationStats() {
  return useQuery({
    queryKey: KEYS.stats,
    queryFn: fetchStats,
    staleTime: STATS_STALE_TIME_MS,
  });
}

/** Create a new application. */
export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => createApplication(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      queryClient.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

/** Update an existing application. */
export function useUpdateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => updateApplication(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      queryClient.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

/** Delete an application. */
export function useDeleteApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      queryClient.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}
