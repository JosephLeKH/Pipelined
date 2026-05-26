/** Pipeline metrics — collapsed single-line summary or expanded metric grid with goal. */

import { useEffect, useRef, useState } from "react";

import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import Activity from "lucide-react/dist/esm/icons/activity";
import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import Clock from "lucide-react/dist/esm/icons/clock";
import Bell from "lucide-react/dist/esm/icons/bell";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";

import { useApplicationStats } from "../hooks/useApplications";
import { STALE_APPLICATIONS_LABEL } from "../lib/aiConstants";
import ApiErrorMessage from "./ApiErrorMessage";
import GoalProgress from "./GoalProgress";

const COUNT_UP_DURATION_MS = 400;

const METRIC_CONFIG = [
  { key: "total_applied", label: "Total Applied", Icon: TrendingUp },
  { key: "active_count", label: "Active", Icon: Activity },
  { key: "response_rate", label: "Response Rate", Icon: CheckCircle },
  { key: "avg_days_to_first_response", label: "Avg Days to Response", Icon: Clock },
  { key: "stale_count", label: STALE_APPLICATIONS_LABEL, Icon: Bell },
];

const COLLAPSED_SUMMARY = [
  { key: "total_applied", label: "applications" },
  { key: "active_count", label: "active" },
  { key: "stale_count", label: "ghosted" },
];

function getRawValue(key, stats) {
  if (key === "response_rate") return stats.response_rate ?? null;
  if (key === "avg_days_to_first_response") return stats.avg_days_to_first_response ?? null;
  return stats[key] ?? null;
}

function formatCounted(key, current, stats) {
  if (!stats) return "N/A";
  if (key === "response_rate") return `${(current * 100).toFixed(1)}%`;
  if (key === "avg_days_to_first_response") {
    return stats.avg_days_to_first_response != null ? current.toFixed(1) : "N/A";
  }
  return String(Math.round(current));
}

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
      const eased = 1 - (1 - t) ** 3;
      setCurrent(target * eased);
      if (t < 1) requestAnimationFrame(tick);
      else setCurrent(target);
    }
    requestAnimationFrame(tick);
  }, [target]);

  return current;
}

function MetricCell({ metricKey, label, stats, isLoading, Icon }) {
  const rawValue = stats ? getRawValue(metricKey, stats) : null;
  const counted = useCountUp(rawValue);
  const displayValue = stats ? formatCounted(metricKey, counted, stats) : "N/A";

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 p-4" aria-label={`${label}: loading`}>
        <div className="h-7 w-16 animate-pulse rounded bg-surface-2" />
        <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-4" aria-label={`${label}: ${displayValue}`}>
      <span className="text-2xl font-semibold leading-none text-text-1">{displayValue}</span>
      <span className="mt-1 flex items-center gap-1.5 text-sm text-text-3">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {label}
      </span>
    </div>
  );
}

function CollapsedSummary({ stats, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2" aria-hidden="true">
        <div className="h-3.5 w-48 animate-pulse rounded bg-surface-2" />
      </div>
    );
  }

  return (
    <div
      className="flex min-w-0 flex-1 flex-wrap items-center gap-x-0 text-[0.8125rem] sm:flex-nowrap"
      data-testid="stats-collapsed-summary"
    >
      {COLLAPSED_SUMMARY.map(({ key, label }, index) => {
        const value = stats ? getRawValue(key, stats) : null;
        const display = typeof value === "number" ? String(value) : "N/A";
        return (
          <span key={key} className="shrink-0">
            {index > 0 && <span className="text-text-3"> · </span>}
            <span className="font-medium text-text-1">{display}</span>
            <span className="text-text-3"> {label}</span>
          </span>
        );
      })}
    </div>
  );
}

function StatsBar({ filtersActive = false }) {
  const { data: stats, isLoading, error, refetch } = useApplicationStats();
  const [expanded, setExpanded] = useState(!filtersActive);

  useEffect(() => {
    setExpanded(!filtersActive);
  }, [filtersActive]);

  if (error) return <ApiErrorMessage error={error} onRetry={refetch} />;

  const toggleLabel = expanded ? "Collapse statistics" : "Expand statistics";

  return (
    <div className="flex flex-col gap-3" data-testid="stats-bar">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-1">
        <CollapsedSummary stats={stats ?? null} isLoading={isLoading} />
        <span className="hidden shrink-0 text-text-3 lg:inline" aria-hidden="true">
          |
        </span>
        <div className="min-w-0 shrink">
          <GoalProgress variant="compact" />
        </div>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-label={toggleLabel}
          className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-3 hover:bg-surface-1 hover:text-text-1 motion-reduce:transition-none transition-colors duration-hover ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="overflow-hidden rounded-lg border border-border-1 motion-reduce:transition-none">
          <div className="grid grid-cols-1 gap-px bg-border-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <div className="bg-surface-0">
              <GoalProgress variant="inline" />
            </div>
            {METRIC_CONFIG.map(({ key, label, Icon }) => (
              <div key={key} className="bg-surface-0">
                <MetricCell
                  metricKey={key}
                  label={label}
                  stats={stats ?? null}
                  isLoading={isLoading}
                  Icon={Icon}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default StatsBar;
