/** Analytics page: charts showing job search patterns. */

import { useState } from "react";

import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";

import useAnalyticsData from "../hooks/useAnalyticsData";
import { Button } from "../components/ui/button";
import { AnalyticsMainCharts, AnalyticsTagsTable, AnalyticsFunnelSection } from "../components/AnalyticsCharts";
import EmptyState from "../components/EmptyState";
import ErrorBoundary from "../components/ErrorBoundary";
import NavBar from "../components/NavBar";

const DATE_RANGES = [
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "Last 180 days", value: 180 },
  { label: "All time", value: null },
];

function AnalyticsLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavBar />
      <main className="flex flex-1 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
      </main>
    </div>
  );
}

function AnalyticsError({ onRetry }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavBar />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 text-destructive">
        <p>Failed to load analytics.</p>
        <Button variant="outline" onClick={onRetry} aria-label="Retry loading analytics">
          Try again
        </Button>
      </main>
    </div>
  );
}

function AnalyticsDateRangePicker({ days, setDays }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
      {DATE_RANGES.map(({ label, value }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          onClick={() => setDays(value)}
          className={`rounded-full px-3 py-1 text-xs font-medium h-auto ${
            days === value
              ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}

function Analytics() {
  const [days, setDays] = useState(90);
  const { analytics, funnelData, tagOfferRates, hasEnoughData, isLoading, error, refetch } = useAnalyticsData(days);

  if (isLoading) return <AnalyticsLoading />;
  if (error) return <AnalyticsError onRetry={refetch} />;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavBar />
      <main className="flex-1 px-4 sm:px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold text-foreground">Analytics</h1>
          <AnalyticsDateRangePicker days={days} setDays={setDays} />
        </div>
        {!hasEnoughData ? (
          <EmptyState
            title="Not enough data yet"
            description="Add at least 3 applications to unlock analytics and insights."
            icon={BarChart3}
          />
        ) : (
          <ErrorBoundary fallback={
            <div role="alert" className="rounded-lg border border-border bg-card p-8 text-center">
              <p className="text-sm font-medium text-foreground">Unable to load charts. Try refreshing the page.</p>
            </div>
          }>
            <div className="flex flex-col gap-6">
              <AnalyticsMainCharts analytics={analytics} />
              {tagOfferRates.length > 0 && <AnalyticsTagsTable tagOfferRates={tagOfferRates} />}
              <AnalyticsFunnelSection funnelData={funnelData} />
            </div>
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
}

export default Analytics;
