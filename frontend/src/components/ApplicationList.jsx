/** Virtualized application list with sortable columns, stale indicators, archive/delete, and bulk selection. */

import { useMemo, useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FixedSizeList } from "react-window";

import Globe from "lucide-react/dist/esm/icons/globe";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard";
import Pencil from "lucide-react/dist/esm/icons/pencil";

import {
  useApplications,
  useArchiveApplication,
  useBulkDeleteApplications,
  useBulkUpdateApplicationStage,
  useDeleteApplication,
  useUnarchiveApplication,
} from "../hooks/useApplications";
import { STAGE_COLORS, DEFAULT_STAGE_COLOR, STALE_APPLICATION_DAYS } from "../lib/constants";
import ApiErrorMessage from "./ApiErrorMessage";
import { BulkActionBar, BulkDeleteConfirmModal, DeleteConfirmModal, RowMenu } from "./ApplicationRowActions";

const MS_PER_DAY = 86_400_000;

const SOURCE_ICONS = {
  extension: Globe,
  board: LayoutDashboard,
  manual: Pencil,
};

function isStale(updatedAt) {
  return Date.now() - new Date(updatedAt).getTime() > STALE_APPLICATION_DAYS * MS_PER_DAY;
}

function StagePill({ stage }) {
  const color = STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR;
  return (
    <span
      aria-label={stage}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
      {stage}
    </span>
  );
}

function ApplicationRow({
  application, onSelect, style, onArchive, onUnarchive, onDelete,
  checked, onToggle, hasSelection,
}) {
  const SourceIcon = SOURCE_ICONS[application.source] ?? Pencil;
  const stale = isStale(application.updated_at);
  const dateApplied = new Date(application.date_applied).toLocaleDateString();
  const archived = Boolean(application.archived);
  const checkboxVisible = hasSelection ? "opacity-100" : "opacity-0 group-hover:opacity-100";

  return (
    <div
      style={style}
      className={`group flex cursor-pointer items-center gap-4 border-b border-gray-100 px-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${archived ? "opacity-60" : ""}`}
      onClick={() => onSelect(application)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(application); }}
      role="row"
      tabIndex={0}
    >
      <span className={`shrink-0 transition-opacity ${checkboxVisible}`} onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          aria-label={`Select ${application.company}`}
          checked={checked}
          onChange={() => onToggle(application.id)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600"
        />
      </span>
      <span className="relative w-2 shrink-0 group/stale">
        {stale && !archived && (
          <>
            <span
              className="block h-2 w-2 rounded-full bg-amber-400"
              data-testid="stale-indicator"
              aria-label="Stale application — no updates in 14+ days"
            />
            <span
              role="tooltip"
              className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 group-hover/stale:opacity-100"
            >
              No updates in 14 days — consider following up
            </span>
          </>
        )}
      </span>
      <span className={`w-40 truncate font-medium ${archived ? "text-gray-400 line-through" : "text-gray-900"}`}>
        {application.company}
      </span>
      <span className={`flex-1 truncate text-sm ${archived ? "text-gray-400" : "text-gray-700"}`}>
        {application.role_title}
      </span>
      <StagePill stage={application.current_stage} />
      <span className="w-28 text-sm text-gray-500">{dateApplied}</span>
      <SourceIcon className="h-4 w-4 shrink-0 text-gray-400" aria-label={application.source} />
      <RowMenu
        application={application}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
        onDelete={onDelete}
      />
    </div>
  );
}

function ColumnHeader({ field, label, sortBy, sortOrder, onSort }) {
  const isActive = sortBy === field;
  return (
    <button
      type="button"
      className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      onClick={() => onSort(field)}
    >
      {label}
      {isActive && <span>{sortOrder === "asc" ? "↑" : "↓"}</span>}
    </button>
  );
}

function ApplicationList({ onSelect, filters = {} }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeletePending, setBulkDeletePending] = useState(false);

  const sortBy = searchParams.get("sort_by") ?? "date_applied";
  const sortOrder = searchParams.get("sort_order") ?? "desc";

  const queryFilters = useMemo(
    () => ({ ...filters, sort_by: sortBy, sort_order: sortOrder }),
    [filters, sortBy, sortOrder]
  );

  const { data: envelope, isLoading, error, refetch } = useApplications(queryFilters);
  const applications = envelope?.data ?? [];
  const hasSelection = selectedIds.size > 0;

  const archiveMutation = useArchiveApplication();
  const unarchiveMutation = useUnarchiveApplication();
  const deleteMutation = useDeleteApplication();
  const bulkDeleteMutation = useBulkDeleteApplications();
  const bulkStageMutation = useBulkUpdateApplicationStage();

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

  const handleArchive = useCallback((id) => archiveMutation.mutate(id), [archiveMutation]);
  const handleUnarchive = useCallback((id) => unarchiveMutation.mutate(id), [unarchiveMutation]);
  const handleDeleteRequest = useCallback((id) => setPendingDeleteId(id), []);
  const handleDeleteConfirm = useCallback(
    (id) => { deleteMutation.mutate(id); setPendingDeleteId(null); },
    [deleteMutation]
  );

  const handleBulkDeleteConfirm = useCallback(() => {
    bulkDeleteMutation.mutate([...selectedIds], {
      onSuccess: () => { setSelectedIds(new Set()); setBulkDeletePending(false); },
    });
  }, [bulkDeleteMutation, selectedIds]);

  const handleBulkMoveToStage = useCallback((stage) => {
    bulkStageMutation.mutate({ ids: [...selectedIds], stage }, {
      onSuccess: () => setSelectedIds(new Set()),
    });
  }, [bulkStageMutation, selectedIds]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 py-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    );
  }

  if (error) return <ApiErrorMessage error={error} onRetry={refetch} />;

  if (!applications.length) {
    return <div className="py-16 text-center text-gray-500">No applications match your filters.</div>;
  }

  const allSelected = applications.length > 0 && selectedIds.size === applications.length;

  const Row = ({ index, style }) => (
    <ApplicationRow
      application={applications[index]}
      onSelect={onSelect}
      style={style}
      onArchive={handleArchive}
      onUnarchive={handleUnarchive}
      onDelete={handleDeleteRequest}
      checked={selectedIds.has(applications[index].id)}
      onToggle={handleToggle}
      hasSelection={hasSelection}
    />
  );

  return (
    <>
      {pendingDeleteId && (
        <DeleteConfirmModal
          appId={pendingDeleteId}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
      {bulkDeletePending && (
        <BulkDeleteConfirmModal
          count={selectedIds.size}
          onConfirm={handleBulkDeleteConfirm}
          onCancel={() => setBulkDeletePending(false)}
        />
      )}
      <div className="flex flex-col gap-2">
        {hasSelection && (
          <BulkActionBar
            selectedCount={selectedIds.size}
            onMoveToStage={handleBulkMoveToStage}
            onDeleteSelected={() => setBulkDeletePending(true)}
          />
        )}
        <div className="flex flex-col">
          <div className="flex items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-2">
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
          <FixedSizeList height={600} itemCount={applications.length} itemSize={64} width="100%">
            {Row}
          </FixedSizeList>
        </div>
      </div>
    </>
  );
}

export default ApplicationList;
