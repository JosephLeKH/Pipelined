/** Row-level action menu, delete confirmation modal, and bulk action bar for ApplicationList. */

import { useState, useRef, useEffect } from "react";

import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";

import { STAGE_COLORS } from "../lib/constants";

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
      <button
        type="button"
        aria-label="Application actions"
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-gray-200 bg-white shadow-lg"
        >
          {application.archived ? (
            <button
              role="menuitem"
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => { setOpen(false); onUnarchive(application.id); }}
            >
              Unarchive
            </button>
          ) : (
            <button
              role="menuitem"
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => { setOpen(false); onArchive(application.id); }}
            >
              Archive
            </button>
          )}
          <button
            role="menuitem"
            type="button"
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={() => { setOpen(false); onDelete(application.id); }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function DeleteConfirmModal({ appId, onConfirm, onCancel }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm delete"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="w-80 rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-base font-semibold text-gray-900">Delete application?</h2>
        <p className="mb-6 text-sm text-gray-600">
          This will permanently delete the application and cannot be undone.
          Consider archiving instead.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(appId)}
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
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
      aria-label="Confirm bulk delete"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="w-80 rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-base font-semibold text-gray-900">
          Delete {count} {label}?
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          This will permanently delete {count} {label} and cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete {count}
          </button>
        </div>
      </div>
    </div>
  );
}

const STAGE_OPTIONS = Object.keys(STAGE_COLORS);

export function BulkActionBar({ selectedCount, onMoveToStage, onDeleteSelected }) {
  const [selectedStage, setSelectedStage] = useState("");

  function handleMove() {
    if (!selectedStage) return;
    onMoveToStage(selectedStage);
    setSelectedStage("");
  }

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm"
    >
      <span className="font-medium text-blue-800">{selectedCount} selected</span>
      <div className="ml-auto flex items-center gap-2">
        <select
          aria-label="Move to stage"
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700"
        >
          <option value="">Move to stage…</option>
          {STAGE_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={!selectedStage}
          onClick={handleMove}
          className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Move
        </button>
        <button
          type="button"
          onClick={onDeleteSelected}
          className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
        >
          Delete selected
        </button>
      </div>
    </div>
  );
}
