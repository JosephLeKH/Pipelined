/** Activity feed page: chronological agent runs across the account. */

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Activity from "lucide-react/dist/esm/icons/activity";

import { useAgentActivity } from "../hooks/useAgentActivity";
import AgentActivityFeed, { AgentActivityError } from "../components/AgentActivityFeed";
import { getAgentActivityHref } from "../lib/agentActivity";

const ACTIVITY_FEED_LIMIT = 50;

function ActivityPage() {
  const navigate = useNavigate();
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
          Activity
        </h1>
        {!isLoading && !isError && (
          <p className="mt-0.5 text-sm text-text-3">
            {entries.length} run{entries.length !== 1 ? "s" : ""}
          </p>
        )}
      </header>

      {isError ? (
        <AgentActivityError onRetry={refetch} />
      ) : (
        <AgentActivityFeed
          entries={entries}
          isLoading={isLoading}
          onEntryClick={handleEntryClick}
        />
      )}
    </main>
  );
}

export default ActivityPage;
