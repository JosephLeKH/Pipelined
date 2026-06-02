/** Activity feed page: chronological agent runs across the account. */

import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import Activity from "lucide-react/dist/esm/icons/activity";

import { useAgentActivity } from "../hooks/useAgentActivity";
import AgentActivityFeed, { AgentActivityError } from "../components/AgentActivityFeed";
import { getAgentActivityHref } from "../lib/agentActivity";

const ACTIVITY_FEED_LIMIT = 50;

const FILTERS = [
  { id: "all", label: "All", types: null },
  { id: "scored", label: "Scored", types: ["fit_score", "fit_score_auto"] },
  { id: "drafted", label: "Drafted", types: ["apply_pack_generated", "follow_up_drafted"] },
  { id: "found", label: "Found", types: ["autopilot_match", "watchlist_match"] },
  { id: "flagged", label: "Flagged", types: ["ghost_detected", "stale_app"] },
];

function ActivityPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const { data: entries = [], isLoading, isError, refetch } = useAgentActivity({
    limit: ACTIVITY_FEED_LIMIT,
  });

  const handleEntryClick = useCallback(
    (entry) => {
      const href = getAgentActivityHref(entry);
      if (href) navigate(href);
    },
    [navigate],
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-text-1">
          <Activity className="h-5 w-5 text-text-3" aria-hidden="true" />
          Scout's Activity
        </h1>
        <p className="mt-0.5 text-sm text-text-3">
          Everything Scout has done for you, newest first.
        </p>
      </header>

      {isError ? (
        <AgentActivityError onRetry={refetch} />
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Filter activity"
            className="mb-4 flex flex-wrap gap-2"
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-2.5 py-1 text-xs ${
                  filter === f.id
                    ? "bg-brand-600 text-white"
                    : "bg-surface-1 text-text-2 hover:bg-surface-2"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <AgentActivityFeed
            entries={entries}
            isLoading={isLoading}
            onEntryClick={handleEntryClick}
            filterTypes={FILTERS.find((f) => f.id === filter)?.types ?? null}
          />
        </>
      )}
    </main>
  );
}

export default ActivityPage;
