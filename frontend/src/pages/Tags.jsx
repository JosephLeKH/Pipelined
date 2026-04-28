/** Tag management page: view, rename, and delete tags across all applications. */

import { useState, useCallback } from "react";

import Check from "lucide-react/dist/esm/icons/check";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import XIcon from "lucide-react/dist/esm/icons/x";
import Tag from "lucide-react/dist/esm/icons/tag";

import { useTags, useRenameTag, useDeleteTag } from "../hooks/useApplications";
import { BUTTON_SECONDARY, BUTTON_DANGER, BUTTON_GHOST, INPUT_BASE, CARD_BASE, SPINNER_LG, MODAL_BACKDROP, MODAL_CARD } from "../lib/designTokens";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
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

function TagNameEditor({ name, onSave, onCancel }) {
  const [value, setValue] = useState(name);

  const handleSave = useCallback(() => {
    const trimmed = value.trim().toLowerCase();
    if (trimmed && trimmed !== name) onSave(trimmed);
    else onCancel();
  }, [value, name, onSave, onCancel]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onCancel();
  }, [handleSave, onCancel]);

  return (
    <div className="flex items-center gap-2">
      <input type="text" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={handleKeyDown} autoFocus className={`${INPUT_BASE} max-w-xs`} />
      <button type="button" onClick={handleSave} aria-label="Save" className={`${BUTTON_GHOST} p-1.5`}>
        <Check className="h-4 w-4 text-green-600" />
      </button>
      <button type="button" onClick={onCancel} aria-label="Cancel" className={`${BUTTON_GHOST} p-1.5`}>
        <XIcon className="h-4 w-4 text-gray-500" />
      </button>
    </div>
  );
}

function TagRow({ tag, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);

  return (
    <tr className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <td className="px-4 py-3">
        {editing ? (
          <TagNameEditor name={tag.name} onSave={(newName) => { onRename(tag.name, newName); setEditing(false); }} onCancel={() => setEditing(false)} />
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-0.5 text-sm font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            {tag.name}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 tabular-nums">{tag.count}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setEditing(true)} aria-label={`Rename tag ${tag.name}`} className={`${BUTTON_GHOST} p-1.5`}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => onDelete(tag)} aria-label={`Delete tag ${tag.name}`} className={`${BUTTON_GHOST} p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300`}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function TagsTable({ tags, onRename, onDelete }) {
  return (
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
            <TagRow key={tag.name} tag={tag} onRename={onRename} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Tags() {
  const { data: tagsData, isLoading, error: fetchError, refetch } = useTags();
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

  const mutationError = renameMutation.error || deleteMutation.error;

  return (
    <div className="flex min-h-screen flex-col bg-surface-secondary dark:bg-gray-900">
      <NavBar />
      <main className="flex-1 px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-xl font-semibold text-gray-900 dark:text-gray-100">Tags</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage tags across all your applications.</p>
        </div>

        {fetchError && (
          <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>Failed to load tags.</span>
              </div>
              <button
                type="button"
                onClick={refetch}
                aria-label="Retry loading tags"
                className={`${BUTTON_SECONDARY} text-sm`}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {mutationError && (
          <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {mutationError.response?.data?.error?.message ?? "Something went wrong. Please try again."}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><div className={SPINNER_LG} /></div>
        ) : tags.length === 0 ? (
          <EmptyState title="No tags yet" description="Add tags to your applications to organise and filter them." icon={Tag} />
        ) : (
          <TagsTable tags={tags} onRename={handleRename} onDelete={setDeleteTarget} />
        )}

        {deleteTarget && (
          <DeleteConfirmModal tag={deleteTarget.name} count={deleteTarget.count} onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)} isPending={deleteMutation.isPending} />
        )}
      </main>
    </div>
  );
}

export default Tags;
