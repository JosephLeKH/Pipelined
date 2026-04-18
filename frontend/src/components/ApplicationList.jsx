/** Virtualized application list with sortable columns, stale indicators, archive/delete, and bulk selection. */

import { useMemo, useCallback, useState, useRef, useEffect, memo } from "react";
import { useSearchParams } from "react-router-dom";
import { FixedSizeList } from "react-window";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useHotkeys } from "../hooks/useHotkeys";
import { useWindowHeight } from "../hooks/useWindowHeight";

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
  KEYS,
} from "../hooks/useApplications";
import { SKELETON_ROW_COUNT, LIST_OFFSET_PX } from "../lib/constants";
import FolderOpen from "lucide-react/dist/esm/icons/folder-open";
import ApiErrorMessage from "./ApiErrorMessage";
import ApplicationRow from "./ApplicationRow";
import { ApplicationListHeader } from "./ApplicationListHeader";
import { BulkActionBar, BulkDeleteConfirmModal } from "./ApplicationRowActions";
import EmptyState from "./EmptyState";
import MergeDialog from "./MergeDialog";
import SkeletonRow from "./SkeletonRow";
import UndoToast from "./UndoToast";

function ApplicationList({ onSelect, filters = {}, onAdd, onImportCsv, shortcutsEnabled = false, onClearFilters }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [undoAction, setUndoAction] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const listRef = useRef(null);
  const windowHeight = useWindowHeight();

  const sortBy = searchParams.get("sort_by") ?? "date_applied";
  const sortOrder = searchParams.get("sort_order") ?? "desc";

  const queryFilters = useMemo(
    () => ({ ...filters, sort_by: sortBy, sort_order: sortOrder }),
    [filters, sortBy, sortOrder]
  );

  const { data: envelope, isLoading, isFetching, error, refetch } = useApplications(queryFilters);
  const applications = envelope?.data ?? [];
  const hasSelection = selectedIds.size > 0;

  const queryClient = useQueryClient();
  const archiveMutation = useArchiveApplication();
  const unarchiveMutation = useUnarchiveApplication();
  const deleteMutation = useDeleteApplication();
  const restoreMutation = useRestoreApplication();
  const bulkDeleteMutation = useBulkDeleteApplications();
  const bulkStageMutation = useBulkUpdateApplicationStage();
  const bulkEditMutation = useBulkEditApplications();
  const mergeMutation = useMergeApplications();

  const handleSort = useCallback(
    (field) => {
      const next = new URLSearchParams(searchParams);
      if (sortBy === field) {
        next.set("sort_order", sortOrder === "asc" ? "desc" : "asc");
      } else {
        next.set("sort_by", field);
        next.set("sort_order", "desc");
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, sortBy, sortOrder]
  );

  const handleToggle = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === applications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applications.map((a) => a.id)));
    }
  }, [selectedIds.size, applications]);

  const handleArchive = useCallback((id) => {
    const previousData = queryClient.getQueryData(KEYS.list(queryFilters));
    queryClient.setQueryData(KEYS.list(queryFilters), (old) =>
      old ? { ...old, data: old.data.filter((a) => a.id !== id) } : old
    );
    archiveMutation.mutate(id, {
      onSuccess: () => setUndoAction({ type: "archive", id }),
      onError: () => queryClient.setQueryData(KEYS.list(queryFilters), previousData),
    });
  }, [archiveMutation, queryClient, queryFilters]);

  const handleUnarchive = useCallback((id) => unarchiveMutation.mutate(id), [unarchiveMutation]);

  const handleDelete = useCallback((id) => {
    const previousData = queryClient.getQueryData(KEYS.list(queryFilters));
    queryClient.setQueryData(KEYS.list(queryFilters), (old) =>
      old ? { ...old, data: old.data.filter((a) => a.id !== id) } : old
    );
    deleteMutation.mutate(id, {
      onSuccess: () => setUndoAction({ type: "delete", id }),
      onError: () => queryClient.setQueryData(KEYS.list(queryFilters), previousData),
    });
  }, [deleteMutation, queryClient, queryFilters]);

  const handleUndo = useCallback(() => {
    if (!undoAction) return;
    if (undoAction.type === "delete") {
      restoreMutation.mutate(undoAction.id);
    } else {
      unarchiveMutation.mutate(undoAction.id);
    }
    setUndoAction(null);
  }, [undoAction, restoreMutation, unarchiveMutation]);

  const handleBulkDeleteConfirm = useCallback(() => {
    const count = selectedIds.size;
    bulkDeleteMutation.mutate([...selectedIds], { onSuccess: () => { setSelectedIds(new Set()); setBulkDeletePending(false); toast.success(`Deleted ${count} application${count === 1 ? "" : "s"}`); } });
  }, [bulkDeleteMutation, selectedIds]);

  const handleMergeConfirm = useCallback((payload) => {
    mergeMutation.mutate(payload, { onSuccess: () => { setSelectedIds(new Set()); setMergeDialogOpen(false); toast.success("Applications merged successfully"); } });
  }, [mergeMutation]);

  const handleBulkMoveToStage = useCallback((stage) => {
    const count = selectedIds.size;
    bulkStageMutation.mutate({ ids: [...selectedIds], stage }, { onSuccess: () => { setSelectedIds(new Set()); toast.success(`Moved ${count} application${count === 1 ? "" : "s"} to ${stage}`); } });
  }, [bulkStageMutation, selectedIds]);

  const handleBulkEdit = useCallback((update) => {
    const count = selectedIds.size;
    bulkEditMutation.mutate(
      { application_ids: [...selectedIds], update },
      { onSuccess: () => { setSelectedIds(new Set()); toast.success(`Updated ${count} application${count === 1 ? "" : "s"}`); } }
    );
  }, [bulkEditMutation, selectedIds]);

  // Reset keyboard focus when application list changes
  useEffect(() => { setFocusedIdx(-1); }, [applications.length]);

  useHotkeys("j", () => { setFocusedIdx((prev) => { const n = Math.min(prev + 1, applications.length - 1); listRef.current?.scrollToItem(n, "smart"); return n; }); }, { enabled: shortcutsEnabled });
  useHotkeys("k", () => { setFocusedIdx((prev) => { const n = Math.max(prev - 1, 0); listRef.current?.scrollToItem(n, "smart"); return n; }); }, { enabled: shortcutsEnabled });
  useHotkeys("Enter", () => { if (focusedIdx >= 0 && focusedIdx < applications.length) onSelect(applications[focusedIdx]); }, { enabled: shortcutsEnabled });
  useHotkeys("x", () => { if (focusedIdx >= 0 && focusedIdx < applications.length) handleToggle(applications[focusedIdx].id); }, { enabled: shortcutsEnabled });
  useHotkeys("Escape", () => setFocusedIdx(-1), { enabled: shortcutsEnabled && focusedIdx >= 0 });

  if (isLoading) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (error) return <ApiErrorMessage error={error} onRetry={refetch} />;

  if (!applications.length) {
    const hasFilters = Object.keys(filters).length > 0;
    if (hasFilters) {
      return (
        <div className="py-16 text-center text-gray-500">
          <p>No applications match your filters.</p>
          {onClearFilters && (
            <button type="button" onClick={onClearFilters} className="mt-3 text-sm text-brand-600 hover:underline">
              Clear all filters
            </button>
          )}
        </div>
      );
    }
    const actionButtons = [
      ...(onAdd ? [{ label: "Add Application", onClick: onAdd }] : []),
      ...(onImportCsv ? [{ label: "Import CSV", onClick: onImportCsv }] : []),
    ];
    return (
      <EmptyState
        title="No applications yet"
        description="Start tracking your job search by adding your first application."
        icon={FolderOpen}
        actionButton={actionButtons.length > 0 ? actionButtons : undefined}
      />
    );
  }

  const allSelected = applications.length > 0 && selectedIds.size === applications.length;

  const Row = ({ index, style }) => (
    <ApplicationRow
      application={applications[index]}
      onSelect={onSelect}
      style={style}
      onArchive={handleArchive}
      onUnarchive={handleUnarchive}
      onDelete={handleDelete}
      checked={selectedIds.has(applications[index].id)}
      onToggle={handleToggle}
      hasSelection={hasSelection}
      isFocused={focusedIdx === index}
    />
  );

  const undoMessage = undoAction?.type === "delete" ? "Application deleted." : "Application archived.";

  const mergeApps = mergeDialogOpen
    ? applications.filter((a) => selectedIds.has(a.id))
    : null;

  return (
    <>
      {bulkDeletePending && (
        <BulkDeleteConfirmModal
          count={selectedIds.size}
          onConfirm={handleBulkDeleteConfirm}
          onCancel={() => setBulkDeletePending(false)}
        />
      )}
      {mergeDialogOpen && mergeApps?.length === 2 && (
        <MergeDialog
          apps={mergeApps}
          onConfirm={handleMergeConfirm}
          onCancel={() => setMergeDialogOpen(false)}
          isPending={mergeMutation.isPending}
        />
      )}
      {undoAction && (
        <UndoToast
          message={undoMessage}
          onUndo={handleUndo}
          onDismiss={() => setUndoAction(null)}
        />
      )}
      <div className="flex flex-col gap-2">
        {hasSelection && (
          <BulkActionBar
            selectedCount={selectedIds.size}
            onMoveToStage={handleBulkMoveToStage}
            onDeleteSelected={() => setBulkDeletePending(true)}
            onMerge={() => setMergeDialogOpen(true)}
            onBulkEdit={handleBulkEdit}
            isDeleting={bulkDeleteMutation.isPending}
            isMoving={bulkStageMutation.isPending}
            isMerging={mergeMutation.isPending}
            isEditing={bulkEditMutation.isPending}
          />
        )}
        <div className="relative flex flex-col">
          {isFetching && !isLoading && (
            <div
              className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-blue-400"
              aria-hidden="true"
              data-testid="fetch-progress-bar"
            />
          )}
          <ApplicationListHeader
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            allSelected={allSelected}
            onSelectAll={handleSelectAll}
          />
          <FixedSizeList ref={listRef} height={Math.max(300, windowHeight - LIST_OFFSET_PX)} itemCount={applications.length} itemSize={64} width="100%">
            {Row}
          </FixedSizeList>
        </div>
      </div>
    </>
  );
}

export default memo(ApplicationList);
