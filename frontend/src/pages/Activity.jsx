/** Activity feed page: unified chronological timeline of all user actions. */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Activity from "lucide-react/dist/esm/icons/activity";

import NavBar from "../components/NavBar";
import { useActivityFeed } from "../hooks/useActivity";
import { BUTTON_SECONDARY, CARD_BASE, SPINNER_SM } from "../lib/designTokens";

const TIME_RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: 0 },
];

const TYPE_STYLES = {
  applied: "bg-brand-500",
  stage_change: "bg-accent-blue",
  event_created: "bg-amber-500",
};

function entryLabel(entry) {
  const { type, company, role_title, details } = entry;
  if (type === "applied") {
    return `Applied to ${role_title || "a role"} at ${company || "a company"}`;
  }
  if (type === "stage_change") {
    return `Moved ${company || "a company"} ${role_title || ""} from ${details.from_stage} to ${details.to_stage}`;
  }
  if (type === "event_created") {
    return `Scheduled ${details.event_type || "interview"} for ${company || "a company"}`;
  }
  return type;
}

function TimelineEntry({ entry, onClick }) {
  const dotClass = TYPE_STYLES[entry.type] ?? "bg-gray-400";
  const ts = new Date(entry.timestamp);
  const dateStr = ts.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const timeStr = ts.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <button
      type="button"
      onClick={() => onClick(entry.application_id)}
      className="group relative flex w-full items-start gap-4 rounded-md px-2 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
    >
      {/* Timeline dot */}
      <div className="mt-1.5 flex-shrink-0">
        <span className={`block h-3 w-3 rounded-full ${dotClass} ring-2 ring-white dark:ring-gray-800`} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 dark:text-gray-100 dark:group-hover:text-brand-400">
          {entryLabel(entry)}
        </p>
        <p className="mt-0.5 text-xs text-gray-400">
          {dateStr} · {timeStr}
        </p>
      </div>
    </button>
  );
}

function ActivityHeader({ days, total, isLoading, onDaysChange }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-gray-900 dark:text-gray-100">
          <Activity className="h-5 w-5 text-gray-600" />
          Activity
        </h1>
        {!isLoading && (
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {total} action{total !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
        {TIME_RANGES.map((range) => (
          <button
            key={range.days}
            type="button"
            onClick={() => onDaysChange(range.days)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              days === range.days
                ? "bg-brand-600 text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActivityError({ onRetry }) {
  return (
    <div className={`${CARD_BASE} flex flex-col items-center gap-3 px-6 py-16 text-center`}>
      <p className="text-sm font-medium text-rose-600">Failed to load activity.</p>
      <button
        type="button"
        onClick={onRetry}
        aria-label="Retry loading activity"
        className={BUTTON_SECONDARY}
      >
        Try again
      </button>
    </div>
  );
}

function ActivityTimeline({ isLoading, entries, onEntryClick }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className={SPINNER_SM} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={`${CARD_BASE} px-6 py-16 text-center`}>
        <Activity className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No activity yet</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Actions will appear here as you apply, move stages, and schedule interviews.
        </p>
      </div>
    );
  }

  return (
    <div className={`${CARD_BASE} px-4`}>
      <div className="relative border-l border-gray-200 pl-4 dark:border-gray-700 ml-1.5">
        {entries.map((entry, idx) => (
          <TimelineEntry
            key={`${entry.type}-${entry.application_id}-${idx}`}
            entry={entry}
            onClick={onEntryClick}
          />
        ))}
      </div>
    </div>
  );
}

function ActivityPage() {
  const [days, setDays] = useState(30);
  const navigate = useNavigate();
  const { data: feedEnv, isLoading, error, refetch } = useActivityFeed({ days });
  const entries = feedEnv?.data ?? [];
  const total = feedEnv?.meta?.total ?? 0;

  const handleEntryClick = useCallback(
    (applicationId) => {
      if (applicationId) {
        navigate(`/dashboard?selected=${applicationId}`);
      }
    },
    [navigate],
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        <ActivityHeader days={days} total={total} isLoading={isLoading} onDaysChange={setDays} />
        {error
          ? <ActivityError onRetry={refetch} />
          : <ActivityTimeline isLoading={isLoading} entries={entries} onEntryClick={handleEntryClick} />}
      </main>
    </div>
  );
}

export default ActivityPage;
