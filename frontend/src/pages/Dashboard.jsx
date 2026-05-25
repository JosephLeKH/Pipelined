/** Dashboard page: composes StatsBar, FilterBar, ApplicationList or KanbanBoard, DetailPanel, ManualAddForm. */

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useHotkeys } from "../hooks/useHotkeys";
import { GMAIL_STATUS_KEY } from "../hooks/useGmailStatus";

import AutopilotResumeBanner from "../components/AutopilotResumeBanner";
import FilterBar from "../components/FilterBar";
import FollowUpBanner from "../components/FollowUpBanner";
import InboxSetupBanner from "../components/InboxSetupBanner";
import StatsBar from "../components/StatsBar";
import { useFilterBarParams } from "../hooks/useFilterBarParams";
import ApplicationList from "../components/ApplicationList";
import KanbanBoard from "../components/KanbanBoard";
import CsvImportModal from "../components/CsvImportModal";
import DetailPanel from "../components/DetailPanel";
import ManualAddForm from "../components/ManualAddForm";
import OnboardingChecklist from "../components/OnboardingChecklist";
import { DashboardToolbar } from "../components/DashboardToolbar";
import { useApplication, useApplicationStats } from "../hooks/useApplications";
import { useApplicationExport } from "../hooks/useApplicationExport";
import { useDashboardFilters } from "../hooks/useDashboardFilters";
import { VIEW_MODE_STORAGE_KEY, OPEN_IMPORT_CSV_EVENT } from "../lib/constants";
import { trackEvent } from "../lib/analytics";

function DashboardContent({
  viewMode,
  onSetViewMode,
  applicationCount,
  isExporting,
  onExport,
  filters,
  onSelect,
  onAdd,
  onImportCsv,
  shortcutsEnabled,
  onClearFilters,
  selectedApp,
  selectedId,
  onClosePanel,
  isModalOpen,
  isImportOpen,
  onCloseModal,
  onCloseImport,
  addPrefillStage,
  followUpsDue,
  onViewFollowUps,
  expandFollowUpDraft,
  filtersActive,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 px-4 pt-3">
        <OnboardingChecklist />
        <AutopilotResumeBanner />
        <InboxSetupBanner />
        <FollowUpBanner followUpsDue={followUpsDue} onView={onViewFollowUps} />
      </div>
      <DashboardToolbar
        viewMode={viewMode}
        onSetViewMode={onSetViewMode}
        applicationCount={applicationCount}
        isExporting={isExporting}
        onImport={onImportCsv}
        onExport={onExport}
        onAdd={onAdd}
      />
      <FilterBar />
      <div className="flex flex-col gap-4 px-4 pb-6">
        <section role="region" aria-label="Goal progress and statistics">
          <StatsBar filtersActive={filtersActive} />
        </section>
        <section role="region" aria-label="Application board">
          {viewMode === "kanban" ? (
            <KanbanBoard
              filters={filters}
              onSelect={onSelect}
              onAddStage={(stage) => onAdd(stage)}
            />
          ) : (
            <ApplicationList
              filters={filters}
              onSelect={onSelect}
              onAdd={onAdd}
              onImportCsv={onImportCsv}
              shortcutsEnabled={shortcutsEnabled}
              onClearFilters={onClearFilters}
              selectedId={selectedId}
            />
          )}
        </section>
      </div>
      <DetailPanel
        application={selectedApp ?? null}
        onClose={onClosePanel}
        expandFollowUpDraft={expandFollowUpDraft}
      />
      <ManualAddForm isOpen={isModalOpen} onClose={onCloseModal} initialStage={addPrefillStage} />
      <CsvImportModal isOpen={isImportOpen} onClose={onCloseImport} />
    </div>
  );
}

function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [addPrefillStage, setAddPrefillStage] = useState("");

  useEffect(() => {
    if (searchParams.get("gmail_connected") === "1") {
      queryClient.invalidateQueries({ queryKey: GMAIL_STATUS_KEY });
      toast.success("Gmail connected — syncing your emails now.");
      setSearchParams((prev) => { prev.delete("gmail_connected"); prev.delete("email"); return prev; }, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);

  useEffect(() => {
    const openImport = () => setIsImportOpen(true);
    window.addEventListener(OPEN_IMPORT_CSV_EVENT, openImport);
    return () => window.removeEventListener(OPEN_IMPORT_CSV_EVENT, openImport);
  }, []);
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem(VIEW_MODE_STORAGE_KEY) ?? "list"; }
    catch { return "list"; }
  });
  const { handleCsvExport, isLoading: isExporting } = useApplicationExport();
  const expandFollowUpDraft =
    searchParams.get("section") === "follow-up" ||
    searchParams.get("action") === "follow-up";
  const { filters, selectedId, includeArchived, handleSelect, handleClosePanel, handleClearFilters, handleViewFollowUps } = useDashboardFilters();
  const { activeFilterCount } = useFilterBarParams();
  const { data: selectedApp } = useApplication(selectedId);
  const { data: stats } = useApplicationStats();
  const handleExport = useCallback(async () => {
    await handleCsvExport(includeArchived);
    trackEvent("csv_exported", { count: stats?.data?.total_applied ?? 0 });
  }, [handleCsvExport, includeArchived, stats]);
  const handleSetViewMode = useCallback((mode) => {
    setViewMode(mode);
    try { localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode); }
    catch { console.warn("[dashboard] Failed to persist view mode to localStorage"); }
  }, []);
  const shortcutsEnabled = !isModalOpen && !isImportOpen;
  const openAddModal = useCallback((stage = "") => {
    setAddPrefillStage(stage);
    setIsModalOpen(true);
  }, []);
  const closeAddModal = useCallback(() => {
    setIsModalOpen(false);
    setAddPrefillStage("");
  }, []);
  useHotkeys("a", () => openAddModal(), { enabled: shortcutsEnabled });
  return (
    <>
      <DashboardContent
        viewMode={viewMode}
        onSetViewMode={handleSetViewMode}
        applicationCount={stats?.data?.total_applied}
        isExporting={isExporting}
        onExport={handleExport}
        filters={filters} onSelect={handleSelect} onAdd={openAddModal} onImportCsv={() => setIsImportOpen(true)}
        shortcutsEnabled={shortcutsEnabled} onClearFilters={handleClearFilters} selectedApp={selectedApp} selectedId={selectedId} onClosePanel={handleClosePanel}
        isModalOpen={isModalOpen} isImportOpen={isImportOpen} onCloseModal={closeAddModal} onCloseImport={() => setIsImportOpen(false)}
        addPrefillStage={addPrefillStage}
        followUpsDue={stats?.follow_ups_due ?? 0}
        onViewFollowUps={() => handleViewFollowUps(stats?.first_follow_up_due_id)}
        expandFollowUpDraft={expandFollowUpDraft}
        filtersActive={activeFilterCount > 0}
      />
    </>
  );
}

export default Dashboard;
