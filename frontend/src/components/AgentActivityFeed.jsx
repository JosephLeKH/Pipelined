/** Grouped agent activity feed with date headings — PRD §6 list pattern. */

import Bot from "lucide-react/dist/esm/icons/bot";

import AgentActivityRow from "./AgentActivityRow";
import { Button } from "./ui/button";
import { groupAgentEntriesByDate } from "../lib/agentActivity";

function DateHeading({ label }) {
  return (
    <h2 className="pt-4 text-[0.6875rem] font-medium uppercase tracking-wider text-text-3 first:pt-0">
      {label}
    </h2>
  );
}

function ActivityFeedSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-lg border border-border-1 bg-surface-0 px-3 py-2"
      aria-hidden="true"
      aria-label="Loading activity"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex h-10 items-center gap-3">
          <div className="h-2 w-2 rounded-full shimmer-bg animate-shimmer" />
          <div className="h-4 flex-1 rounded shimmer-bg animate-shimmer" />
          <div className="h-3 w-12 rounded shimmer-bg animate-shimmer" />
        </div>
      ))}
    </div>
  );
}

function AgentActivityFeed({ entries, isLoading, onEntryClick, emptyMessage, filterTypes = null }) {
  if (isLoading) {
    return <ActivityFeedSkeleton />;
  }

  const filteredEntries = filterTypes
    ? entries.filter((e) => filterTypes.includes(e.agent_type))
    : entries;

  if (filteredEntries.length === 0) {
    return (
      <div className="rounded-lg border border-border-1 bg-surface-0 px-6 py-16 text-center">
        <Bot className="mx-auto mb-3 h-10 w-10 text-text-3/40" aria-hidden="true" />
        <p className="text-sm font-medium text-text-1">{emptyMessage ?? "No activity yet"}</p>
        <p className="mt-1 text-xs text-text-3">
          Agent runs will appear here as autopilot scans, briefs, and syncs complete.
        </p>
      </div>
    );
  }

  const groups = groupAgentEntriesByDate(filteredEntries);

  return (
    <div
      role="region"
      aria-label="Agent activity timeline"
      className="overflow-hidden rounded-lg border border-border-1 bg-surface-0 px-3 py-2"
      data-testid="agent-activity-feed"
    >
      {groups.map((group) => (
        <section key={group.dateKey} aria-label={group.label}>
          <DateHeading label={group.label} />
          {group.entries.map((entry) => (
            <AgentActivityRow
              key={entry.id}
              entry={entry}
              onClick={onEntryClick}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

export function AgentActivityError({ onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border-1 bg-surface-0 px-6 py-16 text-center">
      <p className="text-sm font-medium text-destructive">Failed to load activity.</p>
      <Button variant="outline" onClick={onRetry} aria-label="Retry loading activity">
        Try again
      </Button>
    </div>
  );
}

export default AgentActivityFeed;
