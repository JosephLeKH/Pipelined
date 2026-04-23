/** Row-level action menu, delete confirmation modal, and bulk action bar for ApplicationList. */

import { useState, useRef, useEffect } from "react";

import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";

import { BUTTON_SECONDARY, MODAL_CARD } from "../lib/designTokens";
import { useAuth } from "../context/AuthContext";
import { BULK_EDIT_MAX_IDS } from "../lib/constants";

function RowMenuDropdown({ application, onArchive, onUnarchive, onDelete, onClose }) {
  return (
    <div role="menu" className="absolute right-0 z-20 mt-1 w-36 rounded-card border border-gray-200 bg-white shadow-card dark:bg-gray-800 dark:border-gray-700">
      {application.archived ? (
        <button role="menuitem" type="button" className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
          onClick={() => { onClose(); onUnarchive(application.id); }}>
          Unarchive
        </button>
      ) : (
        <button role="menuitem" type="button" className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
          onClick={() => { onClose(); onArchive(application.id); }}>
          Archive
        </button>
      )}
      <button role="menuitem" type="button" className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
        onClick={() => { onClose(); onDelete(application.id); }}>
        Delete
      </button>
    </div>
  );
}

export function RowMenu({ application, onArchive, onUnarchive, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label="Application actions"
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && <RowMenuDropdown application={application} onArchive={onArchive} onUnarchive={onUnarchive} onDelete={onDelete} onClose={() => setOpen(false)} />}
    </div>
  );
}

export function DeleteConfirmModal({ appId, onConfirm, onCancel }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className={`w-80 p-6 ${MODAL_CARD}`}>
        <h2 id="delete-confirm-heading" className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">Delete application?</h2>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          This will permanently delete the application and cannot be undone.
          Consider archiving instead.
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className={`${BUTTON_SECONDARY} text-sm`}>Cancel</button>
          <button type="button" onClick={() => onConfirm(appId)} className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function BulkDeleteConfirmModal({ count, onConfirm, onCancel }) {
  const label = count === 1 ? "application" : "applications";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-delete-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className={`w-80 p-6 ${MODAL_CARD}`}>
        <h2 id="bulk-delete-heading" className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
          Delete {count} {label}?
        </h2>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          This will permanently delete {count} {label} and cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className={`${BUTTON_SECONDARY} text-sm`}>Cancel</button>
          <button type="button" onClick={onConfirm} className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
            Delete {count}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkMoveControls({ stageOptions, selectedStage, setSelectedStage, isMoving, isBusy, onMove }) {
  return (
    <>
      <select aria-label="Move to stage" value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)} disabled={isBusy}
        className="border border-gray-300 bg-white rounded-input px-2 py-1 text-sm text-gray-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors disabled:opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
        <option value="">Move to stage…</option>
        {stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <button type="button" disabled={!selectedStage || isBusy} onClick={onMove}
        className="flex items-center gap-1 bg-brand-500 text-white rounded-button shadow-sm hover:bg-brand-600 active:scale-[0.98] transition-all duration-150 font-medium text-sm px-3 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none">
        {isMoving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
        Move
      </button>
    </>
  );
}

function BulkEditControls({ followUpDate, setFollowUpDate, tagsAdd, setTagsAdd, tagsRemove, setTagsRemove, isBusy, overLimit, isEditing, onApply }) {
  const inputCls = "border border-gray-300 bg-white rounded-input px-2 py-1 text-sm text-gray-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors disabled:opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200";
  return (
    <>
      <input type="date" aria-label="Follow-up date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} disabled={isBusy || overLimit} className={inputCls} />
      <input type="text" aria-label="Tags to add" placeholder="Tags to add…" value={tagsAdd} onChange={(e) => setTagsAdd(e.target.value)} disabled={isBusy || overLimit} className={`w-36 ${inputCls}`} />
      <input type="text" aria-label="Tags to remove" placeholder="Tags to remove…" value={tagsRemove} onChange={(e) => setTagsRemove(e.target.value)} disabled={isBusy || overLimit} className={`w-36 ${inputCls}`} />
      <button type="button" disabled={isBusy || overLimit} onClick={onApply}
        className="flex items-center gap-1 rounded border border-brand-600 px-3 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-brand-400 dark:text-brand-300">
        {isEditing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
        Apply
      </button>
    </>
  );
}

function BulkDangerControls({ selectedCount, isMerging, isDeleting, isBusy, onMerge, onDeleteSelected }) {
  return (
    <>
      {selectedCount === 2 && (
        <button type="button" disabled={isBusy} onClick={onMerge}
          className="flex items-center gap-1 rounded bg-brand-500 px-3 py-1 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
          {isMerging ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
          Merge
        </button>
      )}
      <button type="button" disabled={isBusy} onClick={onDeleteSelected}
        className="flex items-center gap-1 rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
        {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
        Delete selected
      </button>
    </>
  );
}

export function BulkActionBar({ selectedCount, onMoveToStage, onDeleteSelected, onMerge, onBulkEdit, isDeleting = false, isMoving = false, isMerging = false, isEditing = false }) {
  const { user } = useAuth();
  const stageOptions = user?.default_stages ?? [];
  const [selectedStage, setSelectedStage] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [tagsAdd, setTagsAdd] = useState("");
  const [tagsRemove, setTagsRemove] = useState("");
  const isBusy = isDeleting || isMoving || isMerging || isEditing;
  const overLimit = selectedCount > BULK_EDIT_MAX_IDS;

  function handleMove() {
    if (!selectedStage || isBusy) return;
    onMoveToStage(selectedStage);
    setSelectedStage("");
  }

  function handleApply() {
    if (isBusy || overLimit) return;
    const update = {};
    if (followUpDate) update.follow_up_date = followUpDate;
    const addList = tagsAdd.split(",").map((t) => t.trim()).filter(Boolean);
    const removeList = tagsRemove.split(",").map((t) => t.trim()).filter(Boolean);
    if (addList.length) update.tags_add = addList;
    if (removeList.length) update.tags_remove = removeList;
    if (!Object.keys(update).length) return;
    onBulkEdit(update);
    setFollowUpDate(""); setTagsAdd(""); setTagsRemove("");
  }

  return (
    <div role="toolbar" aria-label="Bulk actions" className="flex flex-wrap items-center gap-3 rounded-md border border-brand-200 bg-brand-50 px-4 py-2 text-sm dark:bg-brand-900/20 dark:border-brand-700">
      <span className="font-medium text-brand-800 dark:text-brand-200">{selectedCount} selected</span>
      {overLimit && <span className="text-amber-700 dark:text-amber-400">Select {BULK_EDIT_MAX_IDS} or fewer to use bulk edit</span>}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <BulkMoveControls stageOptions={stageOptions} selectedStage={selectedStage} setSelectedStage={setSelectedStage} isMoving={isMoving} isBusy={isBusy} onMove={handleMove} />
        <BulkEditControls followUpDate={followUpDate} setFollowUpDate={setFollowUpDate} tagsAdd={tagsAdd} setTagsAdd={setTagsAdd} tagsRemove={tagsRemove} setTagsRemove={setTagsRemove} isBusy={isBusy} overLimit={overLimit} isEditing={isEditing} onApply={handleApply} />
        <BulkDangerControls selectedCount={selectedCount} isMerging={isMerging} isDeleting={isDeleting} isBusy={isBusy} onMerge={onMerge} onDeleteSelected={onDeleteSelected} />
      </div>
    </div>
  );
}
