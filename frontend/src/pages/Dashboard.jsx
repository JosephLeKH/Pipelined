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
import GoalProgress from "../components/GoalProgress";
import NavBar from "../components/NavBar";
import StatsBar from "../components/StatsBar";
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
import { VIEW_MODE_STORAGE_KEY } from "../lib/constants";
import { trackEvent } from "../lib/analytics";

function DashboardContent({ viewMode, onSetViewMode, isExporting, onExport, filters, onSelect, onAdd, onImportCsv, shortcutsEnabled, onClearFilters, selectedApp, onClosePanel, isModalOpen, isImportOpen, onCloseModal, onCloseImport, followUpsDue, onViewFollowUps, expandFollowUpDraft }) {
  return (
    <main className="flex-1 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <DashboardToolbar viewMode={viewMode} onSetViewMode={onSetViewMode} isExporting={isExporting} onImport={onImportCsv} onExport={onExport} onAdd={onAdd} />
        <OnboardingChecklist onAdd={onAdd} />
        <AutopilotResumeBanner />
        <InboxSetupBanner />
        <FollowUpBanner followUpsDue={followUpsDue} onView={onViewFollowUps} />
        <section role="region" aria-label="Goal progress and statistics">
          <GoalProgress />
          <StatsBar />
        </section>
        <section role="region" aria-label="Application board">
          <FilterBar />
          {viewMode === "kanban" ? (
            <KanbanBoard filters={filters} onSelect={onSelect} />
          ) : (
            <ApplicationList filters={filters} onSelect={onSelect} onAdd={onAdd} onImportCsv={onImportCsv} shortcutsEnabled={shortcutsEnabled} onClearFilters={onClearFilters} />
          )}
        </section>
        <DetailPanel application={selectedApp ?? null} onClose={onClosePanel} expandFollowUpDraft={expandFollowUpDraft} />
        <ManualAddForm isOpen={isModalOpen} onClose={onCloseModal} />
        <CsvImportModal isOpen={isImportOpen} onClose={onCloseImport} />
      </div>
    </main>
  );
}

function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("gmail_connected") === "1") {
      queryClient.invalidateQueries({ queryKey: GMAIL_STATUS_KEY });
      toast.success("Gmail connected — syncing your emails now.");
      setSearchParams((prev) => { prev.delete("gmail_connected"); prev.delete("email"); return prev; }, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem(VIEW_MODE_STORAGE_KEY) ?? "list"; }
    catch { return "list"; }
  });
  const { handleCsvExport, isLoading: isExporting } = useApplicationExport();
  const expandFollowUpDraft = searchParams.get("action") === "follow-up";
  const { filters, selectedId, includeArchived, handleSelect, handleClosePanel, handleClearFilters, handleViewFollowUps } = useDashboardFilters();
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
  useHotkeys("a", () => setIsModalOpen(true), { enabled: shortcutsEnabled });
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavBar />
      <DashboardContent
        viewMode={viewMode} onSetViewMode={handleSetViewMode} isExporting={isExporting} onExport={handleExport}
        filters={filters} onSelect={handleSelect} onAdd={() => setIsModalOpen(true)} onImportCsv={() => setIsImportOpen(true)}
        shortcutsEnabled={shortcutsEnabled} onClearFilters={handleClearFilters} selectedApp={selectedApp} onClosePanel={handleClosePanel}
        isModalOpen={isModalOpen} isImportOpen={isImportOpen} onCloseModal={() => setIsModalOpen(false)} onCloseImport={() => setIsImportOpen(false)}
        followUpsDue={stats?.follow_ups_due ?? 0} onViewFollowUps={handleViewFollowUps}
        expandFollowUpDraft={expandFollowUpDraft}
      />
    </div>
  );
}

export default Dashboard;
