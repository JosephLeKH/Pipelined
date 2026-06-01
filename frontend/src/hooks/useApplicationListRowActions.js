/** Single-item action handlers (sort, archive, delete, undo) for ApplicationList. */

import { useCallback } from "react";
import { toast } from "sonner";

import { KEYS } from "./useApplications";

export function useApplicationListRowActions(data) {
  const {
    archiveMutation, deleteMutation, restoreMutation, unarchiveMutation, undoBulkMutation,
    queryClient, queryFilters, setUndoAction, undoAction,
    searchParams, setSearchParams, sortBy, sortOrder,
  } = data;

  const handleSort = useCallback((field) => {
    const next = new URLSearchParams(searchParams);
    if (sortBy === field) {
      next.set("sort_order", sortOrder === "asc" ? "desc" : "asc");
    } else {
      next.set("sort_by", field);
      next.set("sort_order", "desc");
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, sortBy, sortOrder]);

  const handleArchive = useCallback((id) => {
    const previousData = queryClient.getQueryData(KEYS.list(queryFilters));
    queryClient.setQueryData(KEYS.list(queryFilters), (old) =>
      old ? { ...old, data: old.data.filter((a) => a.id !== id) } : old
    );
    archiveMutation.mutate(id, {
      onSuccess: () => setUndoAction({ type: "archive", id }),
      onError: () => {
        queryClient.setQueryData(KEYS.list(queryFilters), previousData);
        toast.error("Couldn't archive — undone");
      },
    });
  }, [archiveMutation, queryClient, queryFilters, setUndoAction]);

  const handleUnarchive = useCallback(
    (id) =>
      unarchiveMutation.mutate(id, {
        onError: () => toast.error("Couldn't unarchive. Try again."),
      }),
    [unarchiveMutation],
  );

  const handleDelete = useCallback((id) => {
    const previousData = queryClient.getQueryData(KEYS.list(queryFilters));
    queryClient.setQueryData(KEYS.list(queryFilters), (old) =>
      old ? { ...old, data: old.data.filter((a) => a.id !== id) } : old
    );
    deleteMutation.mutate(id, {
      onSuccess: () => setUndoAction({ type: "delete", id }),
      onError: () => {
        queryClient.setQueryData(KEYS.list(queryFilters), previousData);
        toast.error("Couldn't delete — undone");
      },
    });
  }, [deleteMutation, queryClient, queryFilters, setUndoAction]);

  const handleUndo = useCallback(() => {
    if (!undoAction) return;
    const onError = () => toast.error("Undo failed. Try again.");
    if (undoAction.type === "bulk_delete") undoBulkMutation.mutate(undoAction.stackId, { onError });
    else if (undoAction.type === "delete") restoreMutation.mutate(undoAction.id, { onError });
    else unarchiveMutation.mutate(undoAction.id, { onError });
    setUndoAction(null);
  }, [undoAction, restoreMutation, unarchiveMutation, undoBulkMutation, setUndoAction]);

  return { handleSort, handleArchive, handleUnarchive, handleDelete, handleUndo };
}
