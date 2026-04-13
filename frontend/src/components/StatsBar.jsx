/** Displays 5 key pipeline metrics with colored left-border accent cards. */

import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import Activity from "lucide-react/dist/esm/icons/activity";
import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import Clock from "lucide-react/dist/esm/icons/clock";
import Bell from "lucide-react/dist/esm/icons/bell";

import { useApplicationStats } from "../hooks/useApplications";
import ApiErrorMessage from "./ApiErrorMessage";

const METRIC_CONFIG = [
  { key: "total_applied", label: "Total Applied", Icon: TrendingUp, accent: "border-brand-500", iconBg: "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400" },
  { key: "active_count", label: "Active", Icon: Activity, accent: "border-violet-500", iconBg: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" },
  { key: "response_rate", label: "Response Rate", Icon: CheckCircle, accent: "border-emerald-500", iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { key: "avg_days_to_first_response", label: "Avg Days to Response", Icon: Clock, accent: "border-amber-500", iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
  { key: "stale_count", label: "Needs follow-up", Icon: Bell, accent: "border-rose-500", iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" },
];

function formatValue(key, stats) {
  if (!stats) return "—";
  if (key === "response_rate") return `${(stats.response_rate * 100).toFixed(1)}%`;
  if (key === "avg_days_to_first_response") {
    return stats.avg_days_to_first_response != null
      ? stats.avg_days_to_first_response.toFixed(1)
      : "—";
  }
  return stats[key] ?? "—";
}

function MetricCard({ label, value, isLoading, Icon, accent, iconBg }) {
  if (isLoading) {
    return (
      <div
        className={`flex flex-col gap-2 border-l-[3px] p-4 bg-white rounded-card shadow-card border border-slate-200/60 dark:bg-slate-800 dark:border-slate-700 ${accent}`}
        aria-label={`${label}: loading`}
      >
        <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-7 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 border-l-[3px] p-4 bg-white rounded-card shadow-card border border-slate-200/60 dark:bg-slate-800 dark:border-slate-700 ${accent}`}
      aria-label={`${label}: ${value}`}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

function StatsBar() {
  const { data: stats, isLoading, error, refetch } = useApplicationStats();

  if (error) return <ApiErrorMessage error={error} onRetry={refetch} />;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {METRIC_CONFIG.map(({ key, label, Icon, accent, iconBg }) => (
        <MetricCard
          key={key}
          label={label}
          value={formatValue(key, stats)}
          isLoading={isLoading}
          Icon={Icon}
          accent={accent}
          iconBg={iconBg}
        />
      ))}
    </div>
  );
}

export default StatsBar;
