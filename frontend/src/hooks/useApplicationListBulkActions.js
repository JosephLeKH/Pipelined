/** Bulk-selection and bulk-mutation handlers for ApplicationList. */

import { useCallback } from "react";
import { toast } from "sonner";

export function useApplicationListBulkActions(data) {
  const {
    bulkDeleteMutation, bulkStageMutation, bulkEditMutation, mergeMutation,
    selectedIds, setSelectedIds, setBulkDeletePending, setMergeDialogOpen, setUndoAction, applications,
  } = data;

  const handleToggle = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, [setSelectedIds]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === applications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applications.map((a) => a.id)));
    }
  }, [selectedIds.size, applications, setSelectedIds]);

  const handleBulkDeleteConfirm = useCallback(() => {
    const count = selectedIds.size;
    bulkDeleteMutation.mutate([...selectedIds], {
      onSuccess: (data) => {
        setSelectedIds(new Set());
        setBulkDeletePending(false);
        setUndoAction({ type: "bulk_delete", stackId: data?.stack_id, count });
      },
    });
  }, [bulkDeleteMutation, selectedIds, setSelectedIds, setBulkDeletePending, setUndoAction]);

  const handleBulkMoveToStage = useCallback((stage) => {
    const count = selectedIds.size;
    bulkStageMutation.mutate({ ids: [...selectedIds], stage }, {
      onSuccess: () => { setSelectedIds(new Set()); toast.success(`Moved ${count} application${count === 1 ? "" : "s"} to ${stage}`); },
    });
  }, [bulkStageMutation, selectedIds, setSelectedIds]);

  const handleBulkEdit = useCallback((update) => {
    const count = selectedIds.size;
    bulkEditMutation.mutate({ application_ids: [...selectedIds], update }, {
      onSuccess: () => { setSelectedIds(new Set()); toast.success(`Updated ${count} application${count === 1 ? "" : "s"}`); },
    });
  }, [bulkEditMutation, selectedIds, setSelectedIds]);

  const handleMergeConfirm = useCallback((payload) => {
    mergeMutation.mutate(payload, {
      onSuccess: () => { setSelectedIds(new Set()); setMergeDialogOpen(false); toast.success("Applications merged successfully"); },
    });
  }, [mergeMutation, setSelectedIds, setMergeDialogOpen]);

  return { handleToggle, handleSelectAll, handleBulkDeleteConfirm, handleBulkMoveToStage, handleBulkEdit, handleMergeConfirm };
}
