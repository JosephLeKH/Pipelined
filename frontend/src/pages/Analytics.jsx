/** Analytics page: charts showing job search patterns. */

import { useMemo, useState } from "react";

import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";

import useAnalyticsData from "../hooks/useAnalyticsData";
import { Button } from "../components/ui/button";
import { AnalyticsMainCharts, AnalyticsTagsTable, AnalyticsFunnelSection } from "../components/AnalyticsCharts";
import EmptyState from "../components/EmptyState";
import ErrorBoundary from "../components/ErrorBoundary";

const INTERVIEW_STAGES = new Set(["Phone Screen", "Technical", "Onsite", "Behavioral"]);

const DATE_RANGES = [
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "Last 180 days", value: 180 },
  { label: "All time", value: null },
];

function percentDelta(current, previous) {
  if (previous == null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function computeAppliedDelta(weeks) {
  if (!weeks?.length || weeks.length < 2) return null;
  const mid = Math.floor(weeks.length / 2);
  const recent = weeks.slice(mid).reduce((sum, row) => sum + row.count, 0);
  const prior = weeks.slice(0, mid).reduce((sum, row) => sum + row.count, 0);
  return percentDelta(recent, prior);
}

function computeReplyRateDelta(months) {
  if (!months?.length || months.length < 2) return null;
  const recent = months[months.length - 1].rate;
  const prior = months[months.length - 2].rate;
  return percentDelta(recent, prior);
}

function computeKpiMetrics(analytics, stats) {
  const applied = analytics.stage_funnel.reduce((sum, row) => sum + row.count, 0);
  const interviews = analytics.stage_funnel
    .filter((row) => INTERVIEW_STAGES.has(row.stage))
    .reduce((sum, row) => sum + row.count, 0);

  const months = analytics.response_rate_by_month ?? [];
  const replyRate = months.length > 0
    ? months.reduce((sum, row) => sum + row.rate, 0) / months.length
    : stats?.response_rate ?? 0;

  return {
    applied: { value: String(applied), delta: computeAppliedDelta(analytics.applications_by_week) },
    interviews: { value: String(interviews), delta: null },
    replyRate: {
      value: `${(replyRate * 100).toFixed(1)}%`,
      delta: computeReplyRateDelta(months),
    },
    avgResponse: {
      value: stats?.avg_days_to_first_response != null
        ? `${stats.avg_days_to_first_response.toFixed(1)} days`
        : "N/A",
      delta: null,
    },
  };
}

function AnalyticsKpiTile({ label, value, delta }) {
  return (
    <div className="rounded-lg border border-border-1 bg-surface-0 p-4">
      <p className="text-xs uppercase tracking-wider font-medium text-text-3">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-text-1">{value}</p>
      {delta != null && (
        <p className="mt-1 text-xs text-text-2">
          <span className={delta > 0 ? "text-status-success" : "text-brand-700"}>
            {delta > 0 ? "↑" : "↓"} {Math.abs(delta)}%
          </span>{" "}
          vs last period
        </p>
      )}
    </div>
  );
}

function AnalyticsKpiGrid({ analytics, stats }) {
  const metrics = useMemo(() => computeKpiMetrics(analytics, stats), [analytics, stats]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <AnalyticsKpiTile label="Applied" value={metrics.applied.value} delta={metrics.applied.delta} />
      <AnalyticsKpiTile label="Interviews" value={metrics.interviews.value} delta={metrics.interviews.delta} />
      <AnalyticsKpiTile label="Reply rate" value={metrics.replyRate.value} delta={metrics.replyRate.delta} />
      <AnalyticsKpiTile label="Avg response" value={metrics.avgResponse.value} delta={metrics.avgResponse.delta} />
    </div>
  );
}

function AnalyticsLoading() {
  return (
    <main className="flex-1 px-4 sm:px-6 py-8">
        <div className="flex flex-col gap-6" aria-hidden="true">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border-1 bg-surface-0 p-4">
                <div className="mb-2 h-3 w-16 rounded shimmer-bg animate-shimmer" />
                <div className="h-7 w-12 rounded shimmer-bg animate-shimmer" />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border-1 bg-surface-0 p-4">
            <div className="h-4 w-32 rounded shimmer-bg animate-shimmer mb-4" />
            <div className="h-48 rounded shimmer-bg animate-shimmer" />
          </div>
          <div className="rounded-lg border border-border-1 bg-surface-0 p-4">
            <div className="mb-4 h-4 w-28 rounded shimmer-bg animate-shimmer" />
            <div className="h-32 rounded shimmer-bg animate-shimmer" />
          </div>
        </div>
      </main>
  );
}

function AnalyticsError({ onRetry }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 text-destructive">
        <p>Failed to load analytics.</p>
        <Button variant="outline" onClick={onRetry} aria-label="Retry loading analytics">
          Try again
        </Button>
    </main>
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
          aria-pressed={days === value}
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
  const { analytics, funnelData, tagOfferRates, stats, hasEnoughData, isLoading, error, refetch } = useAnalyticsData(days);

  if (isLoading) return <AnalyticsLoading />;
  if (error) return <AnalyticsError onRetry={refetch} />;

  return (
    <main className="flex-1 px-4 sm:px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className=" text-2xl font-semibold text-foreground">Analytics</h1>
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
              <AnalyticsKpiGrid analytics={analytics} stats={stats} />
              <AnalyticsMainCharts analytics={analytics} />
              <AnalyticsFunnelSection funnelData={funnelData} />
              {tagOfferRates.length > 0 && <AnalyticsTagsTable tagOfferRates={tagOfferRates} />}
            </div>
          </ErrorBoundary>
        )}
      </main>
  );
}

export default Analytics;
