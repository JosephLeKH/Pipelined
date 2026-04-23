/** Displays 5 key pipeline metrics with colored left-border accent cards.
 *  Numbers count up from 0 on first load using requestAnimationFrame. */

import { useEffect, useRef, useState } from "react";

import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import Activity from "lucide-react/dist/esm/icons/activity";
import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import Clock from "lucide-react/dist/esm/icons/clock";
import Bell from "lucide-react/dist/esm/icons/bell";

import { useApplicationStats } from "../hooks/useApplications";
import ApiErrorMessage from "./ApiErrorMessage";

const COUNT_UP_DURATION_MS = 400;

const METRIC_CONFIG = [
  { key: "total_applied", label: "Total Applied", Icon: TrendingUp, accent: "border-brand-500", iconBg: "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400" },
  { key: "active_count", label: "Active", Icon: Activity, accent: "border-accent-blue", iconBg: "bg-blue-50 text-accent-blue dark:bg-blue-900/30 dark:text-blue-400" },
  { key: "response_rate", label: "Response Rate", Icon: CheckCircle, accent: "border-emerald-500", iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { key: "avg_days_to_first_response", label: "Avg Days to Response", Icon: Clock, accent: "border-amber-500", iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
  { key: "stale_count", label: "Needs follow-up", Icon: Bell, accent: "border-rose-500", iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" },
];

function getRawValue(key, stats) {
  if (key === "response_rate") return stats.response_rate ?? null;
  if (key === "avg_days_to_first_response") return stats.avg_days_to_first_response ?? null;
  return stats[key] ?? null;
}

function formatCounted(key, current, stats) {
  if (!stats) return "—";
  if (key === "response_rate") return `${(current * 100).toFixed(1)}%`;
  if (key === "avg_days_to_first_response") {
    return stats.avg_days_to_first_response != null ? current.toFixed(1) : "—";
  }
  return String(Math.round(current));
}

/** Counts from 0 to target over COUNT_UP_DURATION_MS on initial mount only — not on refetch.
 *  Skips animation if the user prefers reduced motion (also skips in test environments). */
function useCountUp(target) {
  const [current, setCurrent] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current || typeof target !== "number") return;
    hasAnimated.current = true;

    const prefersMotion = window.matchMedia?.("(prefers-reduced-motion: no-preference)").matches ?? false;
    if (!prefersMotion) {
      setCurrent(target);
      return;
    }

    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / COUNT_UP_DURATION_MS, 1);
      const eased = 1 - (1 - t) ** 3; // ease-out cubic
      setCurrent(target * eased);
      if (t < 1) requestAnimationFrame(tick);
      else setCurrent(target);
    }
    requestAnimationFrame(tick);
  }, [target]);

  return current;
}

function MetricCard({ metricKey, label, stats, isLoading, Icon, accent, iconBg }) {
  const rawValue = stats ? getRawValue(metricKey, stats) : null;
  const counted = useCountUp(rawValue);
  const displayValue = stats ? formatCounted(metricKey, counted, stats) : "—";

  if (isLoading) {
    return (
      <div
        className={`flex flex-col gap-2 border-l-[3px] p-4 bg-white rounded-card shadow-card border border-gray-200/60 dark:bg-gray-800 dark:border-gray-700 ${accent}`}
        aria-label={`${label}: loading`}
      >
        <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-7 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 border-l-[3px] p-4 bg-white rounded-card shadow-card border border-gray-200/60 dark:bg-gray-800 dark:border-gray-700 ${accent}`}
      aria-label={`${label}: ${displayValue}`}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{displayValue}</span>
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
          metricKey={key}
          label={label}
          stats={stats ?? null}
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
