/** Per-application agent activity collapsible section in the detail panel. */

import { useState } from "react";

import Bot from "lucide-react/dist/esm/icons/bot";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";

import { useAgentActivity } from "../hooks/useAgentActivity";
import { agentTypeLabel, AGENT_STATUS_STYLES } from "../lib/agentActivity";
import { formatDate } from "../lib/dateUtils";

function ActivityRow({ entry }) {
  const statusClass = AGENT_STATUS_STYLES[entry.status] ?? "text-muted-foreground";

  return (
    <li className="border-b border-border py-2 last:border-b-0" data-testid="agent-log-row">
      <p className="text-sm font-medium text-foreground">{agentTypeLabel(entry.agent_type)}</p>
      <p className="text-sm text-muted-foreground">{entry.summary}</p>
      <p className={`text-xs ${statusClass}`}>{entry.status}</p>
      <p className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</p>
    </li>
  );
}

function AgentActivitySection({ applicationId }) {
  const [expanded, setExpanded] = useState(false);
  const { data: entries = [], isLoading } = useAgentActivity({
    applicationId,
    limit: 20,
    enabled: expanded,
  });

  return (
    <section aria-label="Agent activity log" className="rounded-lg border border-border p-4">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-foreground"
      >
        <span className="inline-flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Agent activity
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 border-t border-border pt-3">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading agent log…</p>
          )}
          {!isLoading && entries.length === 0 && (
            <p className="text-sm text-muted-foreground">No agent activity for this application.</p>
          )}
          {!isLoading && entries.length > 0 && (
            <ul className="list-none space-y-2" data-testid="agent-log-list">
              {entries.map((entry) => (
                <ActivityRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export default AgentActivitySection;
