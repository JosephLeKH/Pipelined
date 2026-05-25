/** Per-application agent activity collapsible section in the detail panel. */

import { useState } from "react";

import Bot from "lucide-react/dist/esm/icons/bot";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";

import { useAgentActivity } from "../hooks/useAgentActivity";
import AgentActivityRow from "./AgentActivityRow";

function AgentActivitySection({ applicationId }) {
  const [expanded, setExpanded] = useState(false);
  const { data: entries = [], isLoading, isError } = useAgentActivity({
    applicationId,
    limit: 20,
    enabled: expanded,
  });

  return (
    <section
      aria-label="Agent activity log"
      className="rounded-lg border border-border-1 bg-surface-0 p-4"
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-text-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 dark:focus-visible:ring-1"
      >
        <span className="inline-flex items-center gap-2">
          <Bot className="h-4 w-4 text-text-3" aria-hidden="true" />
          Agent activity
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-text-3" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-text-3" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 border-t border-border-1 pt-2">
          {isLoading && (
            <p className="text-sm text-text-3">Loading agent log…</p>
          )}
          {!isLoading && isError && (
            <p className="text-sm text-destructive" role="alert">
              Could not load agent activity.
            </p>
          )}
          {!isLoading && !isError && entries.length === 0 && (
            <p className="text-sm text-text-3">No agent activity for this application.</p>
          )}
          {!isLoading && !isError && entries.length > 0 && (
            <ul className="list-none" data-testid="agent-log-list">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <AgentActivityRow entry={entry} compact />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export default AgentActivitySection;
