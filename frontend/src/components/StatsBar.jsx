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
import { CARD_BASE } from "../lib/designTokens";

const COUNT_UP_DURATION_MS = 400;

const METRIC_CONFIG = [
  { key: "total_applied", label: "Total Applied", Icon: TrendingUp },
  { key: "active_count", label: "Active", Icon: Activity },
  { key: "response_rate", label: "Response Rate", Icon: CheckCircle },
  { key: "avg_days_to_first_response", label: "Avg Days to Response", Icon: Clock },
  { key: "stale_count", label: "Needs follow-up", Icon: Bell },
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

function MetricCard({ metricKey, label, stats, isLoading, Icon }) {
  const rawValue = stats ? getRawValue(metricKey, stats) : null;
  const counted = useCountUp(rawValue);
  const displayValue = stats ? formatCounted(metricKey, counted, stats) : "—";

  if (isLoading) {
    return (
      <div className={`flex flex-col gap-1 p-4 ${CARD_BASE}`} aria-label={`${label}: loading`}>
        <div className="h-7 w-16 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 p-4 ${CARD_BASE}`} aria-label={`${label}: ${displayValue}`}>
      <span className="font-display text-2xl font-semibold text-gray-900 dark:text-gray-100">{displayValue}</span>
      <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {label}
      </span>
    </div>
  );
}

function StatsBar() {
  const { data: stats, isLoading, error, refetch } = useApplicationStats();

  if (error) return <ApiErrorMessage error={error} onRetry={refetch} />;

  return (
    <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
      {METRIC_CONFIG.map(({ key, label, Icon }) => (
        <MetricCard
          key={key}
          metricKey={key}
          label={label}
          stats={stats ?? null}
          isLoading={isLoading}
          Icon={Icon}
        />
      ))}
    </div>
  );
}

export default StatsBar;
