import { useState, useCallback } from "react";
import Download from "lucide-react/dist/esm/icons/download";
import Handshake from "lucide-react/dist/esm/icons/handshake";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard";
import Trophy from "lucide-react/dist/esm/icons/trophy";

import { OfferNegotiationPanel } from "../components/OfferNegotiationPanel";
import { OfferComparisonCard } from "../components/OfferComparisonCard";
import { useApplications, useUpdateApplication } from "../hooks/useApplications";
import { OFFER_STAGE } from "../lib/constants";
import { findBestOfferId } from "../lib/offerUtils";
import { Button } from "../components/ui/button";

const SKELETON_CARD_COUNT = 3;
const SKELETON_ROW_COUNT = 5;

function LoadingState() {
  return (
    <main className="px-4 sm:px-6 py-8" aria-hidden="true">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="h-7 w-48 rounded shimmer-bg animate-shimmer" />
        <div className="h-9 w-32 rounded-lg shimmer-bg animate-shimmer" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-1 bg-surface-0 p-6 flex flex-col gap-3">
            <div className="h-5 w-28 rounded shimmer-bg animate-shimmer" />
            {Array.from({ length: SKELETON_ROW_COUNT }).map((_, j) => (
              <div key={j} className="flex items-center justify-between gap-2">
                <div className="h-3 w-20 rounded shimmer-bg animate-shimmer" />
                <div className="h-3 w-24 rounded shimmer-bg animate-shimmer" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

function ErrorState({ onRetry }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-destructive">
      <p>Failed to load offers.</p>
      <Button type="button" variant="outline" onClick={onRetry} aria-label="Retry loading offers">
        Try again
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-text-3">
      <Trophy className="mb-2 h-10 w-10 text-text-3/40" aria-hidden="true" />
      <p className="text-sm font-medium text-text-1">No offers yet</p>
      <p className="text-xs text-text-3">
        Move an application to the Offer stage to compare packages here.
      </p>
    </div>
  );
}

function OfferComparisonHeader() {
  return (
    <h1 className="text-2xl font-semibold tracking-tight text-text-1">
      Offer comparison
    </h1>
  );
}

function OfferComparisonGrid({ apps, bestOfferId, handleSave }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      role="list"
      aria-label="Offer comparison cards"
    >
      {apps.map((app) => (
        <div key={app.id} role="listitem">
          <OfferComparisonCard
            app={app}
            isBest={bestOfferId === app.id}
            onSave={handleSave}
          />
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { id: "compare", label: "Compare", Icon: LayoutDashboard },
  { id: "negotiate", label: "Negotiate", Icon: Handshake },
];

function TabBar({ activeTab, onTabChange }) {
  return (
    <div className="flex gap-1 rounded-lg bg-surface-1 p-1" role="tablist">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          id={`tab-${id}`}
          role="tab"
          aria-selected={activeTab === id}
          aria-controls={`panel-${id}`}
          onClick={() => onTabChange(id)}
          className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 dark:focus-visible:ring-1 ${
            activeTab === id
              ? "bg-surface-0 text-text-1 shadow-sm"
              : "text-text-3 hover:text-text-1"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}

function useOfferHandlers(updateApp) {
  const handleSave = useCallback(
    (appId, fieldKey, newVal, currentOfferDetails) => {
      updateApp({
        id: appId,
        body: { offer_details: { ...currentOfferDetails, [fieldKey]: newVal } },
      });
    },
    [updateApp]
  );

  return { handleSave };
}

function OfferComparison() {
  const { data, isLoading, error, refetch } = useApplications({ stage: OFFER_STAGE, limit: 100 });
  const { mutate: updateApp } = useUpdateApplication();
  const { handleSave } = useOfferHandlers(updateApp);
  const [activeTab, setActiveTab] = useState("compare");

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState onRetry={refetch} />;

  const apps = data?.data ?? [];
  if (apps.length === 0) return <EmptyState />;

  const bestOfferId = findBestOfferId(apps);

  return (
    <main className="px-4 sm:px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <OfferComparisonHeader />
        <div className="flex items-center gap-3">
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="flex items-center gap-1.5"
            aria-label="Export as PDF"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export PDF
          </Button>
        </div>
      </div>
      <div id="panel-compare" role="tabpanel" aria-labelledby="tab-compare" hidden={activeTab !== "compare"}>
        <OfferComparisonGrid apps={apps} bestOfferId={bestOfferId} handleSave={handleSave} />
      </div>
      <div id="panel-negotiate" role="tabpanel" aria-labelledby="tab-negotiate" hidden={activeTab !== "negotiate"}>
        <OfferNegotiationPanel apps={apps} />
      </div>
    </main>
  );
}

export default OfferComparison;
