/** Tags page: master-detail. Left rail lists tags; right pane shows applications for selected tag. */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import TagIcon from "lucide-react/dist/esm/icons/tag";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";

import { useTags, useRenameTag, useDeleteTag } from "../hooks/useApplications";
import { Button } from "../components/ui/button";
import EmptyState from "../components/EmptyState";
import TagDeleteModal from "../components/TagDeleteModal";
import TagDetailPane from "../components/TagDetailPane";
import { TagListRow } from "../components/TagListRow";
import { getTagColor, loadTagColorOverrides } from "../lib/tagUtils";

const SORT_NAME = "name";
const SORT_COUNT = "count";
const SELECTED_PARAM = "tag";

function TagsList({ tags, colorVersion, selectedName, onSelect, onRename, onDelete, onColorChange }) {
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
            selected={tag.name === selectedName}
            onSelect={onSelect}
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
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedName = searchParams.get(SELECTED_PARAM) ?? "";

  const tags = tagsData?.tags ?? [];

  const sortedTags = useMemo(() => {
    if (sortBy === SORT_COUNT) {
      return [...tags].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }
    return [...tags].sort((a, b) => a.name.localeCompare(b.name));
  }, [tags, sortBy]);

  // Auto-select first tag at md+ so the right pane isn't empty on load.
  useEffect(() => {
    if (!selectedName && sortedTags.length > 0 && typeof window !== "undefined") {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      if (isDesktop) {
        const next = new URLSearchParams(searchParams);
        next.set(SELECTED_PARAM, sortedTags[0].name);
        setSearchParams(next, { replace: true });
      }
    }
  }, [selectedName, sortedTags, searchParams, setSearchParams]);

  // If the currently-selected tag was renamed or deleted, clear the selection.
  useEffect(() => {
    if (!selectedName) return;
    if (tags.length === 0) return;
    if (!tags.some((t) => t.name === selectedName)) {
      const next = new URLSearchParams(searchParams);
      next.delete(SELECTED_PARAM);
      setSearchParams(next, { replace: true });
    }
  }, [tags, selectedName, searchParams, setSearchParams]);

  const handleSelect = useCallback(
    (tag) => {
      const next = new URLSearchParams(searchParams);
      next.set(SELECTED_PARAM, tag.name);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleBackToList = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete(SELECTED_PARAM);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleRename = useCallback(
    (oldTag, newTag) => {
      renameMutation.mutate({ oldTag, newTag }, {
        onSuccess: () => {
          if (selectedName === oldTag) {
            const next = new URLSearchParams(searchParams);
            next.set(SELECTED_PARAM, newTag);
            setSearchParams(next, { replace: true });
          }
        },
      });
    },
    [renameMutation, selectedName, searchParams, setSearchParams],
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

  const selectedTag = tags.find((t) => t.name === selectedName);
  const selectedTagColor = selectedTag ? getTagColor(selectedTag.name) : null;
  const showDetailOnMobile = Boolean(selectedName);

  const renderHeader = () => (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-1">Tags</h1>
        <p className="mt-1 text-sm text-text-3">Click a tag to see its applications.</p>
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
  );

  const renderList = () => (
    <>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-text-3">
          Tags
        </span>
        <span className="text-[0.6875rem] text-text-3 tabular-nums">
          {tags.length} total
        </span>
      </div>
      <TagsList
        tags={sortedTags}
        colorVersion={colorVersion}
        selectedName={selectedName}
        onSelect={handleSelect}
        onRename={handleRename}
        onDelete={setDeleteTarget}
        onColorChange={handleColorChange}
      />
    </>
  );

  return (
    <main className="flex-1 px-4 py-8 sm:px-6">
      {renderHeader()}

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
        <div className="gap-4 md:grid md:grid-cols-[18rem_1fr]">
          {/* Left rail: tag list. Hidden on mobile when a tag is selected. */}
          <div className={`min-w-0 ${showDetailOnMobile ? "hidden md:block" : "block"}`}>
            {renderList()}
          </div>

          {/* Right pane: detail. Hidden on mobile when no tag is selected. */}
          <div
            className={`min-w-0 overflow-hidden rounded-lg border border-border-1 bg-surface-0 ${
              showDetailOnMobile ? "block" : "hidden md:block"
            }`}
          >
            {selectedName && (
              <button
                type="button"
                onClick={handleBackToList}
                className="inline-flex w-full items-center gap-1 border-b border-border-1 px-3 py-2 text-xs font-medium text-text-2 hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-[-2px] md:hidden dark:focus-visible:outline-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                All tags
              </button>
            )}
            <TagDetailPane
              key={selectedName || "empty"}
              tagName={selectedName}
              tagColor={selectedTagColor}
              totalCount={selectedTag?.count ?? 0}
            />
          </div>
        </div>
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
