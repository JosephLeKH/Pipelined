/** Dashboard page: composes StatsBar, FilterBar, ApplicationList, DetailPanel, ManualAddForm. */

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import FilterBar from "../components/FilterBar";
import StatsBar from "../components/StatsBar";
import ApplicationList from "../components/ApplicationList";
import DetailPanel from "../components/DetailPanel";
import ManualAddForm from "../components/ManualAddForm";
import { useApplication } from "../hooks/useApplications";

function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter params written by FilterBar
  const stages = searchParams.getAll("stage");
  const companyTypes = searchParams.getAll("company_type");
  const remoteStatuses = searchParams.getAll("remote_status");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const includeArchived = searchParams.get("include_archived") === "true";

  // Selected application ID from URL
  const selectedId = searchParams.get("selected") ?? "";
  const { data: selectedApp } = useApplication(selectedId);

  // Build filters object for ApplicationList (excludes sort — ApplicationList handles those)
  const filters = useMemo(() => {
    const f = {};
    if (stages.length) f.stage = stages;
    if (companyTypes.length) f.company_type = companyTypes;
    if (remoteStatuses.length) f.remote_status = remoteStatuses;
    if (dateFrom) f.date_from = dateFrom;
    if (dateTo) f.date_to = dateTo;
    if (includeArchived) f.include_archived = true;
    return f;
  }, [stages, companyTypes, remoteStatuses, dateFrom, dateTo, includeArchived]);

  const handleSelect = useCallback(
    (app) => {
      const next = new URLSearchParams(searchParams);
      next.set("selected", app.id);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handleClosePanel = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("selected");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-gray-50 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Application
        </button>
      </div>
      <StatsBar />
      <FilterBar />
      <ApplicationList filters={filters} onSelect={handleSelect} />
      <DetailPanel application={selectedApp ?? null} onClose={handleClosePanel} />
      <ManualAddForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </main>
  );
}

export default Dashboard;
