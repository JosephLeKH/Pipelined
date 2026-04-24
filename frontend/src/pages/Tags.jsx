/** Tag management page: view, rename, and delete tags across all applications. */

import { useState, useCallback } from "react";

import Check from "lucide-react/dist/esm/icons/check";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import XIcon from "lucide-react/dist/esm/icons/x";
import Tag from "lucide-react/dist/esm/icons/tag";

import { useTags, useRenameTag, useDeleteTag } from "../hooks/useApplications";
import { BUTTON_SECONDARY, BUTTON_DANGER, BUTTON_GHOST, INPUT_BASE, CARD_BASE, SPINNER_LG, MODAL_BACKDROP, MODAL_CARD } from "../lib/designTokens";
import EmptyState from "../components/EmptyState";
import NavBar from "../components/NavBar";

function DeleteConfirmModal({ tag, count, onConfirm, onCancel, isPending }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="delete-tag-heading" className={MODAL_BACKDROP}>
      <div className={`w-full max-w-sm ${MODAL_CARD}`}>
        <h3 id="delete-tag-heading" className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100">
          Delete tag
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          This will remove <span className="font-medium text-gray-900 dark:text-gray-100">&ldquo;{tag}&rdquo;</span> from {count} {count === 1 ? "application" : "applications"}. This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={isPending} className={`${BUTTON_SECONDARY} text-sm`}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={isPending} className={`${BUTTON_DANGER} text-sm`}>
            {isPending ? "Deleting\u2026" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TagRow({ tag, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(tag.name);

  const handleSave = useCallback(() => {
    const trimmed = newName.trim().toLowerCase();
    if (trimmed && trimmed !== tag.name) {
      onRename(tag.name, trimmed);
    }
    setEditing(false);
  }, [newName, tag.name, onRename]);

  const handleCancel = useCallback(() => {
    setNewName(tag.name);
    setEditing(false);
  }, [tag.name]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  }, [handleSave, handleCancel]);

  return (
    <tr className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className={`${INPUT_BASE} max-w-xs`}
            />
            <button type="button" onClick={handleSave} aria-label="Save" className={`${BUTTON_GHOST} p-1.5`}>
              <Check className="h-4 w-4 text-green-600" />
            </button>
            <button type="button" onClick={handleCancel} aria-label="Cancel" className={`${BUTTON_GHOST} p-1.5`}>
              <XIcon className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-0.5 text-sm font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            {tag.name}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 tabular-nums">
        {tag.count}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setNewName(tag.name); setEditing(true); }}
            aria-label={`Rename tag ${tag.name}`}
            className={`${BUTTON_GHOST} p-1.5`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(tag)}
            aria-label={`Delete tag ${tag.name}`}
            className={`${BUTTON_GHOST} p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function Tags() {
  const { data: tagsData, isLoading } = useTags();
  const renameMutation = useRenameTag();
  const deleteMutation = useDeleteTag();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const tags = tagsData?.tags ?? [];

  const handleRename = useCallback((oldTag, newTag) => {
    renameMutation.mutate({ oldTag, newTag });
  }, [renameMutation]);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.name, { onSettled: () => setDeleteTarget(null) });
    }
  }, [deleteTarget, deleteMutation]);

  return (
    <div className="flex min-h-screen flex-col bg-surface-secondary dark:bg-gray-900">
      <NavBar />
      <main className="flex-1 px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-xl font-semibold text-gray-900 dark:text-gray-100">Tags</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage tags across all your applications.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className={SPINNER_LG} />
          </div>
        ) : tags.length === 0 ? (
          <EmptyState
            title="No tags yet"
            description="Add tags to your applications to organise and filter them."
            icon={Tag}
          />
        ) : (
          <div className={`${CARD_BASE} overflow-hidden`}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Tag</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Applications</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => (
                  <TagRow key={tag.name} tag={tag} onRename={handleRename} onDelete={setDeleteTarget} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {deleteTarget && (
          <DeleteConfirmModal
            tag={deleteTarget.name}
            count={deleteTarget.count}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
            isPending={deleteMutation.isPending}
          />
        )}
      </main>
    </div>
  );
}

export default Tags;
