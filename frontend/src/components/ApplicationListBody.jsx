/** Main list body: modals, bulk action bar, virtualized rows. */

import { memo } from "react";
import { FixedSizeList } from "react-window";
import ApplicationRow from "./ApplicationRow";
import { ApplicationListHeader } from "./ApplicationListHeader";
import { BulkActionBar, BulkDeleteConfirmModal } from "./ApplicationRowActions";
import MergeDialog from "./MergeDialog";
import UndoToast from "./UndoToast";
import { LIST_OFFSET_PX } from "../lib/constants";

const Row = memo(function Row({ index, style, data }) {
  const { applications, onSelect, onArchive, onUnarchive, onDelete, selectedIds, onToggle, hasSelection, focusedIdx } = data;
  return (
    <ApplicationRow
      application={applications[index]}
      onSelect={onSelect}
      style={style}
      onArchive={onArchive}
      onUnarchive={onUnarchive}
      onDelete={onDelete}
      checked={selectedIds.has(applications[index].id)}
      onToggle={onToggle}
      hasSelection={hasSelection}
      isFocused={focusedIdx === index}
    />
  );
});

export function ApplicationListBody({ d, rowActions, bulkActions, onSelect }) {
  const {
    applications, isFetching, isLoading, sortBy, sortOrder, selectedIds, focusedIdx, windowHeight, listRef,
    bulkDeletePending, setBulkDeletePending, mergeDialogOpen, setMergeDialogOpen,
    undoAction, setUndoAction, bulkDeleteMutation, bulkStageMutation, mergeMutation, bulkEditMutation,
  } = d;
  const { handleSort, handleArchive, handleUnarchive, handleDelete, handleUndo } = rowActions;
  const { handleToggle, handleSelectAll, handleBulkDeleteConfirm, handleBulkMoveToStage, handleBulkEdit, handleMergeConfirm } = bulkActions;
  const hasSelection = selectedIds.size > 0;
  const allSelected = applications.length > 0 && selectedIds.size === applications.length;
  const mergeApps = mergeDialogOpen ? applications.filter((a) => selectedIds.has(a.id)) : null;
  const undoMessage = undoAction?.type === "delete" ? "Application deleted." : "Application archived.";
  const rowData = { applications, onSelect, onArchive: handleArchive, onUnarchive: handleUnarchive, onDelete: handleDelete, selectedIds, onToggle: handleToggle, hasSelection, focusedIdx };
  return (
    <>
      {bulkDeletePending && <BulkDeleteConfirmModal count={selectedIds.size} onConfirm={handleBulkDeleteConfirm} onCancel={() => setBulkDeletePending(false)} />}
      {mergeDialogOpen && mergeApps?.length === 2 && <MergeDialog apps={mergeApps} onConfirm={handleMergeConfirm} onCancel={() => setMergeDialogOpen(false)} isPending={mergeMutation.isPending} />}
      {undoAction && <UndoToast message={undoMessage} onUndo={handleUndo} onDismiss={() => setUndoAction(null)} />}
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
          {isFetching && !isLoading && <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-brand-400" aria-hidden="true" data-testid="fetch-progress-bar" />}
          <ApplicationListHeader sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} allSelected={allSelected} onSelectAll={handleSelectAll} />
          <FixedSizeList ref={listRef} height={Math.max(300, windowHeight - LIST_OFFSET_PX)} itemCount={applications.length} itemSize={64} width="100%" itemData={rowData}>{Row}</FixedSizeList>
        </div>
      </div>
    </>
  );
}
