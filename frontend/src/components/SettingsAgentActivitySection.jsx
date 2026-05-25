/** Settings agent activity timeline — recent agent runs across the account. */

import Bot from "lucide-react/dist/esm/icons/bot";

import { useAgentActivity } from "../hooks/useAgentActivity";
import { agentTypeLabel, AGENT_STATUS_STYLES } from "../lib/agentActivity";
import { formatDate } from "../lib/dateUtils";
import { CARD_BASE } from "../lib/designTokens";

function ActivityNode({ entry }) {
  const statusClass = AGENT_STATUS_STYLES[entry.status] ?? "text-muted-foreground";

  return (
    <li className="flex items-start gap-3 pb-3" data-testid="agent-activity-node">
      <Bot className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          {agentTypeLabel(entry.agent_type)}
        </p>
        <p className="text-sm text-muted-foreground">{entry.summary}</p>
        <p className={`text-xs ${statusClass}`}>{entry.status}</p>
        <p className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</p>
      </div>
    </li>
  );
}

function SettingsAgentActivitySection() {
  const { data: entries = [], isLoading, isError } = useAgentActivity({ limit: 20 });

  return (
    <div className={`${CARD_BASE} p-6`}>
      <h2 className="mb-1 text-lg font-semibold text-foreground">
        Agent activity
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Recent AI agent runs: fit scoring, interview prep, autopilot, email classification, and morning briefs.
      </p>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading agent activity…</p>
      )}

      {!isLoading && isError && (
        <p className="text-sm text-destructive">Could not load agent activity.</p>
      )}

      {!isLoading && !isError && entries.length === 0 && (
        <p className="text-sm text-muted-foreground">No agent activity yet.</p>
      )}

      {!isLoading && !isError && entries.length > 0 && (
        <ul
          className="list-none space-y-0"
          aria-label="Agent activity timeline"
          data-testid="agent-activity-list"
        >
          {entries.map((entry) => (
            <ActivityNode key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default SettingsAgentActivitySection;
