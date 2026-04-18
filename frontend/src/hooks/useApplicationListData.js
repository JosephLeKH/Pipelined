/** State, queries, and mutation handles for ApplicationList. */

import { useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { useWindowHeight } from "./useWindowHeight";
import {
  useApplications,
  useArchiveApplication,
  useBulkDeleteApplications,
  useBulkEditApplications,
  useBulkUpdateApplicationStage,
  useDeleteApplication,
  useMergeApplications,
  useRestoreApplication,
  useUnarchiveApplication,
} from "./useApplications";

export function useApplicationListData(filters) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [undoAction, setUndoAction] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const listRef = useRef(null);
  const windowHeight = useWindowHeight();
  const queryClient = useQueryClient();
  const sortBy = searchParams.get("sort_by") ?? "date_applied";
  const sortOrder = searchParams.get("sort_order") ?? "desc";
  const queryFilters = useMemo(
    () => ({ ...filters, sort_by: sortBy, sort_order: sortOrder }),
    [filters, sortBy, sortOrder]
  );
  const { data: envelope, isLoading, isFetching, error, refetch } = useApplications(queryFilters);
  const applications = envelope?.data ?? [];
  const archiveMutation = useArchiveApplication();
  const unarchiveMutation = useUnarchiveApplication();
  const deleteMutation = useDeleteApplication();
  const restoreMutation = useRestoreApplication();
  const bulkDeleteMutation = useBulkDeleteApplications();
  const bulkStageMutation = useBulkUpdateApplicationStage();
  const bulkEditMutation = useBulkEditApplications();
  const mergeMutation = useMergeApplications();
  return {
    searchParams, setSearchParams, undoAction, setUndoAction,
    selectedIds, setSelectedIds, bulkDeletePending, setBulkDeletePending,
    mergeDialogOpen, setMergeDialogOpen, focusedIdx, setFocusedIdx,
    listRef, windowHeight, queryClient, sortBy, sortOrder, queryFilters,
    applications, isLoading, isFetching, error, refetch,
    archiveMutation, unarchiveMutation, deleteMutation, restoreMutation,
    bulkDeleteMutation, bulkStageMutation, bulkEditMutation, mergeMutation,
  };
}
