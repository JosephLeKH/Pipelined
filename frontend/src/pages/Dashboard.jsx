/** Dashboard page: composes StatsBar, FilterBar, ApplicationList or KanbanBoard, DetailPanel, ManualAddForm. */

import { useState, useCallback } from "react";
import { useHotkeys } from "../hooks/useHotkeys";

import FilterBar from "../components/FilterBar";
import FollowUpBanner from "../components/FollowUpBanner";
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

function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(VIEW_MODE_STORAGE_KEY) ?? "list");
  const { handleCsvExport, isLoading: isExporting } = useApplicationExport();
  const { filters, selectedId, includeArchived, handleSelect, handleClosePanel, handleClearFilters, handleViewFollowUps } = useDashboardFilters();
  const { data: selectedApp } = useApplication(selectedId);
  const { data: stats } = useApplicationStats();

  const handleExport = useCallback(async () => {
    await handleCsvExport(includeArchived);
    trackEvent("csv_exported", { count: stats?.data?.total_applied ?? 0 });
  }, [handleCsvExport, includeArchived, stats]);

  const handleSetViewMode = useCallback((mode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  }, []);

  const shortcutsEnabled = !isModalOpen && !isImportOpen;
  useHotkeys("a", () => setIsModalOpen(true), { enabled: shortcutsEnabled });

  return (
    <div className="flex min-h-screen flex-col bg-surface-secondary">
      <NavBar />
      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <DashboardToolbar viewMode={viewMode} onSetViewMode={handleSetViewMode} isExporting={isExporting} onImport={() => setIsImportOpen(true)} onExport={handleExport} onAdd={() => setIsModalOpen(true)} />
          <OnboardingChecklist onAdd={() => setIsModalOpen(true)} />
          <FollowUpBanner followUpsDue={stats?.follow_ups_due ?? 0} onView={handleViewFollowUps} />
          <GoalProgress />
          <StatsBar />
          <FilterBar />
          {viewMode === "kanban" ? (
            <KanbanBoard filters={filters} onSelect={handleSelect} />
          ) : (
            <ApplicationList filters={filters} onSelect={handleSelect} onAdd={() => setIsModalOpen(true)} onImportCsv={() => setIsImportOpen(true)} shortcutsEnabled={shortcutsEnabled} onClearFilters={handleClearFilters} />
          )}
          <DetailPanel application={selectedApp ?? null} onClose={handleClosePanel} />
          <ManualAddForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
          <CsvImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
