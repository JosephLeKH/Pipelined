/** Displays 4 key pipeline metrics: total applied, active count, response rate, avg days to first response. */

import { useApplicationStats } from "../hooks/useApplications";
import ApiErrorMessage from "./ApiErrorMessage";

function MetricCard({ label, value, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 rounded-lg bg-white p-4 shadow-sm" aria-label={`${label}: loading`}>
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-7 w-16 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white p-4 shadow-sm" aria-label={`${label}: ${value}`}>
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-2xl font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function StatsBar() {
  const { data: stats, isLoading, error, refetch } = useApplicationStats();

  if (error) return <ApiErrorMessage error={error} onRetry={refetch} />;

  const responseRateDisplay = stats
    ? `${(stats.response_rate * 100).toFixed(1)}%`
    : "—";

  const avgDaysDisplay =
    stats?.avg_days_to_first_response != null
      ? stats.avg_days_to_first_response.toFixed(1)
      : "—";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <MetricCard
        label="Total Applied"
        value={stats?.total_applied ?? "—"}
        isLoading={isLoading}
      />
      <MetricCard
        label="Active"
        value={stats?.active_count ?? "—"}
        isLoading={isLoading}
      />
      <MetricCard
        label="Response Rate"
        value={isLoading ? "—" : responseRateDisplay}
        isLoading={isLoading}
      />
      <MetricCard
        label="Avg Days to Response"
        value={isLoading ? "—" : avgDaysDisplay}
        isLoading={isLoading}
      />
      <MetricCard
        label="Needs follow-up"
        value={stats?.stale_count ?? "—"}
        isLoading={isLoading}
      />
    </div>
  );
}

export default StatsBar;
