/** Virtualized application list with sortable columns, stale indicators, archive/delete, and bulk selection. */

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FixedSizeList } from "react-window";
import { toast } from "sonner";

import { useHotkeys } from "../hooks/useHotkeys";

import {
  useApplications,
  useArchiveApplication,
  useBulkDeleteApplications,
  useBulkUpdateApplicationStage,
  useDeleteApplication,
  useMergeApplications,
  useRestoreApplication,
  useUnarchiveApplication,
} from "../hooks/useApplications";
import { SKELETON_ROW_COUNT } from "../lib/constants";
import FolderOpen from "lucide-react/dist/esm/icons/folder-open";
import ApiErrorMessage from "./ApiErrorMessage";
import ApplicationRow from "./ApplicationRow";
import { BulkActionBar, BulkDeleteConfirmModal } from "./ApplicationRowActions";
import EmptyState from "./EmptyState";
import MergeDialog from "./MergeDialog";
import SkeletonRow from "./SkeletonRow";
import UndoToast from "./UndoToast";

function ColumnHeader({ field, label, sortBy, sortOrder, onSort }) {
  const isActive = sortBy === field;
  return (
    <button
      type="button"
      className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:text-gray-400 dark:hover:text-gray-100"
      onClick={() => onSort(field)}
    >
      {label}
      {isActive && <span>{sortOrder === "asc" ? "↑" : "↓"}</span>}
    </button>
  );
}

function ApplicationList({ onSelect, filters = {}, onAdd, onImportCsv, shortcutsEnabled = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [undoAction, setUndoAction] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const listRef = useRef(null);

  const sortBy = searchParams.get("sort_by") ?? "date_applied";
  const sortOrder = searchParams.get("sort_order") ?? "desc";

  const queryFilters = useMemo(
    () => ({ ...filters, sort_by: sortBy, sort_order: sortOrder }),
    [filters, sortBy, sortOrder]
  );

  const { data: envelope, isLoading, isFetching, error, refetch } = useApplications(queryFilters);
  const applications = envelope?.data ?? [];
  const hasSelection = selectedIds.size > 0;

  const archiveMutation = useArchiveApplication();
  const unarchiveMutation = useUnarchiveApplication();
  const deleteMutation = useDeleteApplication();
  const restoreMutation = useRestoreApplication();
  const bulkDeleteMutation = useBulkDeleteApplications();
  const bulkStageMutation = useBulkUpdateApplicationStage();
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

  const handleArchive = useCallback(
    (id) => archiveMutation.mutate(id, {
      onSuccess: () => setUndoAction({ type: "archive", id }),
    }),
    [archiveMutation]
  );
  const handleUnarchive = useCallback((id) => unarchiveMutation.mutate(id), [unarchiveMutation]);
  const handleDelete = useCallback(
    (id) => deleteMutation.mutate(id, {
      onSuccess: () => setUndoAction({ type: "delete", id }),
    }),
    [deleteMutation]
  );

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
    bulkDeleteMutation.mutate([...selectedIds], {
      onSuccess: () => {
        setSelectedIds(new Set());
        setBulkDeletePending(false);
        toast.success(`Deleted ${count} application${count === 1 ? "" : "s"}`);
      },
    });
  }, [bulkDeleteMutation, selectedIds]);

  const handleMergeConfirm = useCallback((payload) => {
    mergeMutation.mutate(payload, {
      onSuccess: () => {
        setSelectedIds(new Set());
        setMergeDialogOpen(false);
        toast.success("Applications merged successfully");
      },
    });
  }, [mergeMutation]);

  const handleBulkMoveToStage = useCallback((stage) => {
    const count = selectedIds.size;
    bulkStageMutation.mutate({ ids: [...selectedIds], stage }, {
      onSuccess: () => {
        setSelectedIds(new Set());
        toast.success(`Moved ${count} application${count === 1 ? "" : "s"} to ${stage}`);
      },
    });
  }, [bulkStageMutation, selectedIds]);

  // Reset keyboard focus when application list changes
  useEffect(() => { setFocusedIdx(-1); }, [applications.length]);

  useHotkeys("j", () => {
    setFocusedIdx((prev) => {
      const next = Math.min(prev + 1, applications.length - 1);
      listRef.current?.scrollToItem(next, "smart");
      return next;
    });
  }, { enabled: shortcutsEnabled });

  useHotkeys("k", () => {
    setFocusedIdx((prev) => {
      const next = Math.max(prev - 1, 0);
      listRef.current?.scrollToItem(next, "smart");
      return next;
    });
  }, { enabled: shortcutsEnabled });

  useHotkeys("Enter", () => {
    if (focusedIdx >= 0 && focusedIdx < applications.length) {
      onSelect(applications[focusedIdx]);
    }
  }, { enabled: shortcutsEnabled });

  useHotkeys("x", () => {
    if (focusedIdx >= 0 && focusedIdx < applications.length) {
      handleToggle(applications[focusedIdx].id);
    }
  }, { enabled: shortcutsEnabled });

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
      return <div className="py-16 text-center text-gray-500">No applications match your filters.</div>;
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
            isDeleting={bulkDeleteMutation.isPending}
            isMoving={bulkStageMutation.isPending}
            isMerging={mergeMutation.isPending}
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
          <div className="flex items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
            <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                aria-label="Select all applications"
                checked={allSelected}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
            </span>
            <div className="w-2 shrink-0" />
            <ColumnHeader field="company" label="Company" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
            <ColumnHeader field="role_title" label="Role" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
            <ColumnHeader field="current_stage" label="Stage" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
            <ColumnHeader field="date_applied" label="Date Applied" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
          </div>
          <FixedSizeList ref={listRef} height={600} itemCount={applications.length} itemSize={64} width="100%">
            {Row}
          </FixedSizeList>
        </div>
      </div>
    </>
  );
}

export default ApplicationList;
