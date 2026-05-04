import { useState, useCallback } from "react";
import confetti from "canvas-confetti";
import Download from "lucide-react/dist/esm/icons/download";
import Handshake from "lucide-react/dist/esm/icons/handshake";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard";
import Trophy from "lucide-react/dist/esm/icons/trophy";

import NavBar from "../components/NavBar";
import { OfferNegotiationPanel } from "../components/OfferNegotiationPanel";
import { EditableCell } from "../components/OfferEditableCell";
import { useApplications, useUpdateApplication } from "../hooks/useApplications";
import { OFFER_FIELDS, OFFER_STAGE } from "../lib/constants";
import { Button } from "../components/ui/button";

const CONFETTI_CONFIG = { particleCount: 150, spread: 80, origin: { y: 0.5 } };
const SKELETON_CARD_COUNT = 3;
const SKELETON_ROW_COUNT = 5;

function LoadingState() {
  return (
    <>
      <NavBar />
      <main className="px-4 sm:px-6 py-8" aria-hidden="true">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="h-7 w-48 rounded shimmer-bg animate-shimmer" />
          <div className="h-9 w-32 rounded-lg shimmer-bg animate-shimmer" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-28 rounded shimmer-bg animate-shimmer" />
                <div className="h-4 w-16 rounded shimmer-bg animate-shimmer" />
              </div>
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
    </>
  );
}

function ErrorState({ onRetry }) {
  return (
    <>
      <NavBar />
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-destructive">
        <p>Failed to load offers.</p>
        <Button type="button" variant="outline" onClick={onRetry} aria-label="Retry loading offers">
          Try again
        </Button>
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <>
      <NavBar />
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Trophy className="mb-2 h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
        <p className="text-sm font-medium font-display text-foreground">No offers yet</p>
        <p className="text-xs font-sans text-muted-foreground">
          Move an application to the Offer stage to compare packages here.
        </p>
      </div>
    </>
  );
}

function OfferComparisonHeader() {
  return (
    <h1 className="font-display text-2xl font-bold text-foreground">
      Offer Comparison
    </h1>
  );
}

function OfferHeaderCell({ app, isWinner, onMarkWinner }) {
  return (
    <th scope="col" className="min-w-[180px] px-4 py-3 text-left">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          {isWinner && <Trophy className="h-4 w-4 text-amber-500 dark:text-amber-400" aria-hidden="true" />}
          <span className="truncate text-sm font-semibold text-foreground">
            {app.company ?? "Unknown"}
          </span>
        </div>
        <span className="truncate text-xs text-muted-foreground">
          {app.role_title ?? ""}
        </span>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onMarkWinner(app.id)}
          className={`mt-1 gap-1 rounded-full px-2.5 py-1 text-xs font-medium h-auto ${
            isWinner
              ? "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300"
              : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
          }`}
        >
          <Trophy className="h-3 w-3" aria-hidden="true" />
          {isWinner ? "Winner!" : "Mark winner"}
        </Button>
      </div>
    </th>
  );
}

function OfferComparisonTable({ apps, winnerId, handleSave, handleMarkWinner }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full divide-y divide-border">
        <caption className="sr-only">Offer comparison</caption>
        <thead className="bg-muted">
          <tr>
            <th scope="col" className="w-36 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Field
            </th>
            {apps.map((app) => (
              <OfferHeaderCell key={app.id} app={app} isWinner={winnerId === app.id} onMarkWinner={handleMarkWinner} />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {OFFER_FIELDS.map((field) => (
            <tr key={field.key} className="hover:bg-muted/50">
              <td className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</td>
              {apps.map((app) => {
                const offerDetails = app.offer_details ?? {};
                return (
                  <td key={app.id} className="px-4 py-3">
                    <EditableCell
                      appId={app.id}
                      fieldKey={field.key}
                      fieldType={field.type}
                      value={offerDetails[field.key] ?? null}
                      offerDetails={offerDetails}
                      onSave={handleSave}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TABS = [
  { id: "compare", label: "Compare", Icon: LayoutDashboard },
  { id: "negotiate", label: "Negotiate", Icon: Handshake },
];

function TabBar({ activeTab, onTabChange }) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1" role="tablist">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          role="tab"
          aria-selected={activeTab === id}
          aria-controls={`panel-${id}`}
          onClick={() => onTabChange(id)}
          className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
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
  const [winnerId, setWinnerId] = useState(null);

  const handleSave = useCallback(
    (appId, fieldKey, newVal, currentOfferDetails) => {
      updateApp({
        id: appId,
        body: { offer_details: { ...currentOfferDetails, [fieldKey]: newVal } },
      });
    },
    [updateApp]
  );

  const handleMarkWinner = useCallback((appId) => {
    setWinnerId(appId);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      confetti(CONFETTI_CONFIG);
    }
  }, []);

  return { winnerId, handleSave, handleMarkWinner };
}

function OfferComparison() {
  const { data, isLoading, error, refetch } = useApplications({ stage: OFFER_STAGE, limit: 100 });
  const { mutate: updateApp } = useUpdateApplication();
  const { winnerId, handleSave, handleMarkWinner } = useOfferHandlers(updateApp);
  const [activeTab, setActiveTab] = useState("compare");

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState onRetry={refetch} />;

  const apps = data?.data ?? [];
  if (apps.length === 0) return <EmptyState />;

  return (
    <>
      <NavBar />
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
        <div id="panel-compare" role="tabpanel" hidden={activeTab !== "compare"}>
          <OfferComparisonTable apps={apps} winnerId={winnerId} handleSave={handleSave} handleMarkWinner={handleMarkWinner} />
        </div>
        <div id="panel-negotiate" role="tabpanel" hidden={activeTab !== "negotiate"}>
          <OfferNegotiationPanel apps={apps} />
        </div>
      </main>
    </>
  );
}

export default OfferComparison;
