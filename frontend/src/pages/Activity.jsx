/** Activity feed page: unified chronological timeline of all user actions. */

import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";

import Activity from "lucide-react/dist/esm/icons/activity";

import NavBar from "../components/NavBar";
import { useActivityFeed } from "../hooks/useActivity";
import { Button } from "../components/ui/button";

const TIME_RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: 0 },
];

const TYPE_STYLES = {
  applied: "bg-primary",
  stage_change: "bg-accent-blue",
  event_created: "bg-amber-400 dark:bg-amber-900/40",
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
  const dotClass = TYPE_STYLES[entry.type] ?? "bg-muted-foreground";
  const ts = new Date(entry.timestamp);
  const dateStr = ts.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const timeStr = ts.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onClick(entry.application_id)}
      className="group relative h-auto w-full items-start justify-start gap-4 rounded-md px-2 py-3 text-left hover:bg-muted/50"
    >
      <div className="mt-1.5 flex-shrink-0">
        <span className={`block h-3 w-3 rounded-full ${dotClass} ring-2 ring-card`} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground group-hover:text-primary">
          {entryLabel(entry)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {dateStr} · {timeStr}
        </p>
      </div>
    </Button>
  );
}

function ActivityHeader({ days, total, isLoading, onDaysChange }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-foreground">
          <Activity className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          Activity
        </h1>
        {!isLoading && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {total} action{total !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
        {TIME_RANGES.map((range) => (
          <Button
            key={range.days}
            type="button"
            variant="ghost"
            aria-pressed={days === range.days}
            onClick={() => onDaysChange(range.days)}
            className={`rounded-full px-3 py-1 text-xs font-medium h-auto ${
              days === range.days
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {range.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ActivityError({ onRetry }) {
  return (
    <div className="rounded-xl bg-card border border-border flex flex-col items-center gap-3 px-6 py-16 text-center">
      <p className="text-sm font-medium text-destructive">Failed to load activity.</p>
      <Button variant="outline" onClick={onRetry} aria-label="Retry loading activity">
        Try again
      </Button>
    </div>
  );
}

function ActivityTimelineSkeleton() {
  return (
    <div
      className="rounded-xl bg-card border border-border px-4"
      aria-hidden="true"
      aria-label="Loading activity"
    >
      <div className="relative border-l border-border pl-4 ml-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 px-2 py-3">
            <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full shimmer-bg animate-shimmer" />
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="h-4 w-3/4 rounded shimmer-bg animate-shimmer" />
              <div className="h-3 w-1/3 rounded shimmer-bg animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityTimeline({ isLoading, entries, onEntryClick }) {
  if (isLoading) {
    return <ActivityTimelineSkeleton />;
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-border px-6 py-16 text-center">
        <Activity className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">No activity yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Actions will appear here as you apply, move stages, and schedule interviews.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-border px-4">
      <div className="relative border-l border-border pl-4 ml-1.5">
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
    <div className="min-h-screen bg-background">
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
