/** Activity feed page: unified chronological timeline of all user actions. */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Activity from "lucide-react/dist/esm/icons/activity";

import NavBar from "../components/NavBar";
import { useActivityFeed } from "../hooks/useActivity";

const TIME_RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: 0 },
];

const TYPE_STYLES = {
  applied: "bg-brand-500",
  stage_change: "bg-violet-500",
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
  const dotClass = TYPE_STYLES[entry.type] ?? "bg-slate-400";
  const ts = new Date(entry.timestamp);
  const dateStr = ts.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const timeStr = ts.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <button
      type="button"
      onClick={() => onClick(entry.application_id)}
      className="group relative flex w-full items-start gap-4 rounded-md px-2 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
    >
      {/* Timeline dot */}
      <div className="mt-1.5 flex-shrink-0">
        <span className={`block h-3 w-3 rounded-full ${dotClass} ring-2 ring-white dark:ring-slate-800`} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 group-hover:text-brand-600 dark:text-slate-100 dark:group-hover:text-brand-400">
          {entryLabel(entry)}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {dateStr} · {timeStr}
        </p>
      </div>
    </button>
  );
}

function ActivityPage() {
  const [days, setDays] = useState(30);
  const navigate = useNavigate();

  const { data: feedEnv, isLoading } = useActivityFeed({ days });
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <NavBar />

      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
              <Activity className="h-5 w-5 text-brand-600" />
              Activity
            </h1>
            {!isLoading && (
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {total} action{total !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Time range selector */}
          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
            {TIME_RANGES.map((range) => (
              <button
                key={range.days}
                type="button"
                onClick={() => setDays(range.days)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  days === range.days
                    ? "bg-brand-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-card border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-800">
            <Activity className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">No activity yet</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Actions will appear here as you apply, move stages, and schedule interviews.
            </p>
          </div>
        ) : (
          <div className="rounded-card border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-800">
            {/* Vertical line + entries */}
            <div className="relative border-l border-slate-200 pl-4 dark:border-slate-700 ml-1.5">
              {entries.map((entry, idx) => (
                <TimelineEntry
                  key={`${entry.type}-${entry.application_id}-${idx}`}
                  entry={entry}
                  onClick={handleEntryClick}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ActivityPage;
