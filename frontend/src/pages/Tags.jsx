/** Tag management page: view, rename, and delete tags across all applications. */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";

import Check from "lucide-react/dist/esm/icons/check";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import XIcon from "lucide-react/dist/esm/icons/x";
import Tag from "lucide-react/dist/esm/icons/tag";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";

import { useTags, useRenameTag, useDeleteTag } from "../hooks/useApplications";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import EmptyState from "../components/EmptyState";

const SORT_NAME = "name";
const SORT_COUNT = "count";
const FOCUSABLE_SELECTORS = 'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function DeleteConfirmModal({ tag, count, onConfirm, onCancel, isPending }) {
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    triggerRef.current = document.activeElement;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const getFocusable = () => [...dialog.querySelectorAll(FOCUSABLE_SELECTORS)];

    const elements = getFocusable();
    if (elements.length > 0) elements[0].focus();

    const handleKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, []);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-tag-heading"
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-lg p-6 mx-auto relative">
        <h3 id="delete-tag-heading" className=" text-lg font-semibold text-foreground">
          Delete tag
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          This will remove <span className="font-medium text-foreground">&ldquo;{tag}&rdquo;</span> from {count} {count === 1 ? "application" : "applications"}. This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Deleting…" : "Delete"}
          </Button>
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
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        className="max-w-xs"
      />
      <Button type="button" variant="ghost" onClick={handleSave} aria-label="Save" className="p-1.5 h-auto">
        <Check className="h-4 w-4 text-primary" aria-hidden="true" />
      </Button>
      <Button type="button" variant="ghost" onClick={onCancel} aria-label="Cancel" className="p-1.5 h-auto">
        <XIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </Button>
    </div>
  );
}

function TagRow({ tag, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-3">
        {editing ? (
          <TagNameEditor
            name={tag.name}
            onSave={(newName) => { onRename(tag.name, newName); setEditing(false); }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
            {tag.name}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">{tag.count}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setEditing(true)}
            aria-label={`Rename tag ${tag.name}`}
            className="p-1.5 h-auto"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onDelete(tag)}
            aria-label={`Delete tag ${tag.name}`}
            className="p-1.5 h-auto text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function TagsTable({ tags, onRename, onDelete }) {
  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <table className="w-full" aria-label="Tags">
        <thead>
          <tr className="border-b border-border bg-muted">
            <th scope="col" className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Tag</th>
            <th scope="col" className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Applications</th>
            <th scope="col" className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Actions</th>
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
  const [sortBy, setSortBy] = useState(SORT_NAME);

  const tags = tagsData?.tags ?? [];

  const sortedTags = useMemo(() => {
    if (sortBy === SORT_COUNT) {
      return [...tags].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }
    return [...tags].sort((a, b) => a.name.localeCompare(b.name));
  }, [tags, sortBy]);

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
    <main className="flex-1 px-4 sm:px-6 py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className=" text-2xl font-semibold text-foreground">Tags</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage tags across all your applications.</p>
          </div>
          <div className="flex gap-1.5 shrink-0" role="group" aria-label="Sort tags">
            <Button
              variant={sortBy === SORT_NAME ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSortBy(SORT_NAME)}
              aria-pressed={sortBy === SORT_NAME}
            >
              Name A→Z
            </Button>
            <Button
              variant={sortBy === SORT_COUNT ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSortBy(SORT_COUNT)}
              aria-pressed={sortBy === SORT_COUNT}
            >
              Count ↓
            </Button>
          </div>
        </div>

        {fetchError && (
          <div role="alert" className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>Failed to load tags.</span>
              </div>
              <Button variant="outline" size="sm" onClick={refetch} aria-label="Retry loading tags">
                Try again
              </Button>
            </div>
          </div>
        )}

        {mutationError && (
          <div role="alert" className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {mutationError.response?.data?.error?.message ?? "Something went wrong. Please try again."}
          </div>
        )}

        {isLoading ? (
          <div aria-hidden="true" className="rounded-xl bg-card border border-border overflow-hidden divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="h-4 w-32 rounded-full shimmer-bg animate-shimmer" />
                <div className="flex gap-1">
                  <div className="h-7 w-7 rounded shimmer-bg animate-shimmer" />
                  <div className="h-7 w-7 rounded shimmer-bg animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : tags.length === 0 ? (
          <EmptyState title="No tags yet" description="Add tags to your applications to organise and filter them." icon={Tag} />
        ) : (
          <TagsTable tags={sortedTags} onRename={handleRename} onDelete={setDeleteTarget} />
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
  );
}

export default Tags;
