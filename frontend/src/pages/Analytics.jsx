/** Analytics page: charts showing job search patterns. */

import { useState } from "react";

import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";

import useAnalyticsData from "../hooks/useAnalyticsData";
import { SPINNER_LG } from "../lib/designTokens";
import { AnalyticsMainCharts, AnalyticsTagsTable, AnalyticsFunnelSection } from "../components/AnalyticsCharts";
import EmptyState from "../components/EmptyState";
import NavBar from "../components/NavBar";

const DATE_RANGES = [
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "Last 180 days", value: 180 },
  { label: "All time", value: null },
];

function AnalyticsLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-secondary dark:bg-gray-900">
      <NavBar />
      <main className="flex flex-1 items-center justify-center">
        <div className={SPINNER_LG} />
      </main>
    </div>
  );
}

function AnalyticsError() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-secondary dark:bg-gray-900">
      <NavBar />
      <main className="p-6 text-center text-rose-600">Failed to load analytics.</main>
    </div>
  );
}

function AnalyticsDateRangePicker({ days, setDays }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
      {DATE_RANGES.map(({ label, value }) => (
        <button
          key={label}
          type="button"
          onClick={() => setDays(value)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            days === value
              ? "bg-brand-500 text-white"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Analytics() {
  const [days, setDays] = useState(90);
  const { analytics, funnelData, tagOfferRates, hasEnoughData, isLoading, error } = useAnalyticsData(days);

  if (isLoading) return <AnalyticsLoading />;
  if (error) return <AnalyticsError />;

  return (
    <div className="flex min-h-screen flex-col bg-surface-secondary dark:bg-gray-900">
      <NavBar />
      <main className="flex-1 px-4 sm:px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-xl font-semibold text-gray-900 dark:text-gray-100">Analytics</h1>
          <AnalyticsDateRangePicker days={days} setDays={setDays} />
        </div>
        {!hasEnoughData ? (
          <EmptyState
            title="Not enough data yet"
            description="Add at least 3 applications to unlock analytics and insights."
            icon={BarChart3}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <AnalyticsMainCharts analytics={analytics} />
            {tagOfferRates.length > 0 && <AnalyticsTagsTable tagOfferRates={tagOfferRates} />}
            <AnalyticsFunnelSection funnelData={funnelData} />
          </div>
        )}
      </main>
    </div>
  );
}

export default Analytics;
