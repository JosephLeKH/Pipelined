/** Row-level action menu and delete confirmation modal for ApplicationList. */

import { useState, useRef, useEffect } from "react";

import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";

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
