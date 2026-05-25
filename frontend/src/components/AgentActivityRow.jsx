/** Single agent activity row — 40 px with colored dot, title, and timestamp. */

import { getAgentDotColor, formatActivityTimestamp } from "../lib/agentActivity";

function AgentActivityDot({ agentType }) {
  const color = getAgentDotColor(agentType);
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

function AgentActivityRow({ entry, onClick, compact = false }) {
  const clickable = Boolean(onClick);
  const title = entry.summary || entry.title;
  const timestamp = formatActivityTimestamp(entry.created_at);

  const rowClass = compact
    ? "flex h-10 items-center gap-3 px-0"
    : "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left transition-colors motion-reduce:transition-none hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 dark:focus-visible:ring-1";

  const inner = (
    <>
      <AgentActivityDot agentType={entry.agent_type} />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-1">
        {title}
      </span>
      <time
        className="shrink-0 text-xs text-text-3 tabular-nums"
        dateTime={entry.created_at}
      >
        {timestamp}
      </time>
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        onClick={() => onClick(entry)}
        className={rowClass}
        data-testid="agent-activity-row"
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={rowClass} data-testid="agent-activity-row">
      {inner}
    </div>
  );
}

export default AgentActivityRow;
