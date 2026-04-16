/** React Query hooks for application data. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trackEvent } from "../lib/analytics";

import {
  archiveApplication,
  bulkDeleteApplications,
  bulkEditApplications,
  bulkUpdateApplicationStage,
  createApplication,
  deleteApplication,
  fetchAnalytics,
  fetchApplication,
  fetchApplications,
  fetchStats,
  importApplicationsCsv,
  mergeApplications,
  restoreApplication,
  unarchiveApplication,
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
  analytics: (days) => ["applications", "analytics", days],
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
      trackEvent("application_deleted");
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      queryClient.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

/** Archive an application (soft delete). */
export function useArchiveApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => archiveApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      queryClient.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

/** Restore an archived application. */
export function useUnarchiveApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => unarchiveApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      queryClient.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

/** Restore a soft-deleted application. */
export function useRestoreApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => restoreApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      queryClient.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

/** Bulk delete multiple applications by id. */
export function useBulkDeleteApplications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids) => bulkDeleteApplications(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      queryClient.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

/** Bulk update stage for multiple applications. */
export function useBulkUpdateApplicationStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, stage }) => bulkUpdateApplicationStage(ids, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      queryClient.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

/** Fetch analytics data for the current user. */
export function useAnalytics(days = null) {
  return useQuery({
    queryKey: KEYS.analytics(days),
    queryFn: () => fetchAnalytics(days),
    staleTime: STATS_STALE_TIME_MS,
  });
}

/** Bulk-import applications from a CSV file. Invalidates lists and stats on success. */
export function useImportApplications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file) => importApplicationsCsv(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

/** Merge source application into target. */
export function useMergeApplications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => mergeApplications(body),
    onSuccess: () => {
      trackEvent("application_merged");
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      queryClient.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

/** Bulk-edit stage, follow_up_date, and/or tags for multiple applications. */
export function useBulkEditApplications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => bulkEditApplications(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
