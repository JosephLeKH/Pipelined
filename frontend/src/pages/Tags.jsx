/** Tag management page: view, rename, and delete tags across all applications. */

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";

import TagIcon from "lucide-react/dist/esm/icons/tag";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";

import { useTags, useRenameTag, useDeleteTag } from "../hooks/useApplications";
import { Button } from "../components/ui/button";
import EmptyState from "../components/EmptyState";
import TagDeleteModal from "../components/TagDeleteModal";
import { TagListRow } from "../components/TagListRow";
import { getTagColor, loadTagColorOverrides } from "../lib/tagUtils";

const SORT_NAME = "name";
const SORT_COUNT = "count";

function TagsList({ tags, colorVersion, onRename, onDelete, onColorChange }) {
  const overrides = loadTagColorOverrides();

  return (
    <div
      className="overflow-hidden rounded-lg border border-border-1 bg-surface-0"
      role="list"
      aria-label="Tags"
    >
      {tags.map((tag) => (
        <div key={`${tag.name}-${colorVersion}`} role="listitem">
          <TagListRow
            tag={tag}
            tagColor={getTagColor(tag.name, overrides)}
            onRename={onRename}
            onDelete={onDelete}
            onColorChange={onColorChange}
          />
        </div>
      ))}
    </div>
  );
}

function TagsLoadingSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-lg border border-border-1 bg-surface-0 divide-y divide-border-1"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex h-10 items-center gap-3 px-3">
          <div className="h-2 w-2 rounded-full shimmer-bg animate-shimmer" />
          <div className="h-4 w-32 rounded shimmer-bg animate-shimmer" />
          <div className="ml-auto h-3 w-24 rounded shimmer-bg animate-shimmer" />
        </div>
      ))}
    </div>
  );
}

function Tags() {
  const { data: tagsData, isLoading, error: fetchError, refetch } = useTags();
  const renameMutation = useRenameTag();
  const deleteMutation = useDeleteTag();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sortBy, setSortBy] = useState(SORT_NAME);
  const [colorVersion, setColorVersion] = useState(0);

  const tags = tagsData?.tags ?? [];

  const sortedTags = useMemo(() => {
    if (sortBy === SORT_COUNT) {
      return [...tags].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }
    return [...tags].sort((a, b) => a.name.localeCompare(b.name));
  }, [tags, sortBy]);

  const handleRename = useCallback(
    (oldTag, newTag) => {
      renameMutation.mutate({ oldTag, newTag });
    },
    [renameMutation],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.name, {
        onSuccess: () => {
          toast.success("Tag deleted");
          setDeleteTarget(null);
        },
        onError: (error) => {
          const msg = error?.response?.data?.detail ?? "Couldn't delete tag — try again";
          toast.error(msg);
        },
      });
    }
  }, [deleteTarget, deleteMutation]);

  const handleColorChange = useCallback(() => {
    setColorVersion((v) => v + 1);
  }, []);

  const mutationError = renameMutation.error || deleteMutation.error;

  return (
    <main className="flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-1">Tags</h1>
          <p className="mt-1 text-sm text-text-3">Manage tags across all your applications.</p>
        </div>
        <div className="flex shrink-0 gap-1.5" role="group" aria-label="Sort tags">
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
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Failed to load tags.</span>
            </div>
            <Button variant="outline" size="sm" onClick={refetch} aria-label="Retry loading tags">
              Try again
            </Button>
          </div>
        </div>
      )}

      {mutationError && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {mutationError.response?.data?.error?.message ?? "Something went wrong. Please try again."}
        </div>
      )}

      {isLoading ? (
        <TagsLoadingSkeleton />
      ) : tags.length === 0 ? (
        <EmptyState
          title="No tags yet"
          description="Add tags to your applications to organise and filter them."
          icon={TagIcon}
        />
      ) : (
        <TagsList
          tags={sortedTags}
          colorVersion={colorVersion}
          onRename={handleRename}
          onDelete={setDeleteTarget}
          onColorChange={handleColorChange}
        />
      )}

      {deleteTarget && (
        <TagDeleteModal
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
