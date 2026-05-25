/** Virtualized application list with sortable columns, stale indicators, archive/delete, and bulk selection. */

import { memo } from "react";
import { useApplicationListData } from "../hooks/useApplicationListData";
import { useApplicationListRowActions } from "../hooks/useApplicationListRowActions";
import { useApplicationListBulkActions } from "../hooks/useApplicationListBulkActions";
import { useApplicationListKeyboard } from "../hooks/useApplicationListKeyboard";
import { ApplicationListEmpty } from "./ApplicationListEmpty";
import { ApplicationListBody } from "./ApplicationListBody";

function ApplicationList({ onSelect, filters = {}, onAdd, onImportCsv, shortcutsEnabled = false, onClearFilters, selectedId = "" }) {
  const d = useApplicationListData(filters);
  const rowActions = useApplicationListRowActions(d);
  const bulkActions = useApplicationListBulkActions(d);
  useApplicationListKeyboard({ applications: d.applications, shortcutsEnabled, focusedIdx: d.focusedIdx, setFocusedIdx: d.setFocusedIdx, listRef: d.listRef, onSelect, handleToggle: bulkActions.handleToggle });
  if (d.isLoading || d.error || !d.applications.length) {
    return <ApplicationListEmpty isLoading={d.isLoading} error={d.error} refetch={d.refetch} applications={d.applications} filters={filters} onClearFilters={onClearFilters} onAdd={onAdd} onImportCsv={onImportCsv} />;
  }
  return <ApplicationListBody d={d} rowActions={rowActions} bulkActions={bulkActions} onSelect={onSelect} selectedId={selectedId} />;
}

export default memo(ApplicationList);
