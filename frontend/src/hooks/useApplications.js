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
  fetchFunnel,
  fetchStats,
  fetchTags,
  renameTag,
  deleteTag,
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
  funnel: ["applications", "funnel"],
  tags: ["applications", "tags"],
};

/** List applications with optional filters/pagination. */
export function useApplications(filters = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: ({ signal }) => fetchApplications(filters, { signal }),
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
    onMutate: async ({ id, body }) => {
      await queryClient.cancelQueries({ queryKey: KEYS.detail(id) });
      await queryClient.cancelQueries({ queryKey: KEYS.lists() });

      const previousDetail = queryClient.getQueryData(KEYS.detail(id));
      const previousLists = queryClient.getQueriesData({ queryKey: KEYS.lists() });

      queryClient.setQueryData(KEYS.detail(id), (old) =>
        old ? { ...old, data: { ...old.data, ...body } } : old
      );
      queryClient.setQueriesData({ queryKey: KEYS.lists() }, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((app) => (app.id === id ? { ...app, ...body } : app)),
        };
      });

      return { previousDetail, previousLists };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(KEYS.detail(id), context.previousDetail);
      }
      if (context?.previousLists) {
        for (const [queryKey, data] of context.previousLists) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
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

/** Fetch per-stage funnel metrics for the current user. */
export function useFunnel() {
  return useQuery({
    queryKey: KEYS.funnel,
    queryFn: fetchFunnel,
    staleTime: STATS_STALE_TIME_MS,
  });
}

/** Fetch all tags used by the current user. Returns { tags: [{ name, count }] }. */
export function useTags() {
  return useQuery({
    queryKey: KEYS.tags,
    queryFn: fetchTags,
    staleTime: STATS_STALE_TIME_MS,
  });
}

/** Bulk-edit stage, follow_up_date, and/or tags for multiple applications. */
export function useBulkEditApplications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => bulkEditApplications(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      queryClient.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

/** Rename a tag across all user applications. */
export function useRenameTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ oldTag, newTag }) => renameTag({ oldTag, newTag }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.tags });
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

/** Delete a tag from all user applications. */
export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tag) => deleteTag(tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.tags });
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
