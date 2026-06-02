/** Collapsible agent row: icon + name + state pill + summary + expand.
 *  Hosts an existing AI feature section (passed as children) when expanded. */

import { useState } from "react";

import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Check from "lucide-react/dist/esm/icons/check";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import Circle from "lucide-react/dist/esm/icons/circle";

import { AGENT_STATE } from "./useAgentStates";

const PILL_BASE = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide";

const PILL_STYLE = {
  [AGENT_STATE.IDLE]: `${PILL_BASE} bg-surface-2 text-text-3`,
  [AGENT_STATE.READY]: `${PILL_BASE} bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300`,
  [AGENT_STATE.RUNNING]: `${PILL_BASE} bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-200`,
  [AGENT_STATE.ERROR]: `${PILL_BASE} bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300`,
};

const PILL_LABEL = {
  [AGENT_STATE.IDLE]: "Idle",
  [AGENT_STATE.READY]: "Ready",
  [AGENT_STATE.RUNNING]: "Running",
  [AGENT_STATE.ERROR]: "Error",
};

function StatePill({ state }) {
  const Icon = {
    [AGENT_STATE.IDLE]: Circle,
    [AGENT_STATE.READY]: Check,
    [AGENT_STATE.RUNNING]: Loader2,
    [AGENT_STATE.ERROR]: AlertCircle,
  }[state];

  const iconClass = state === AGENT_STATE.RUNNING ? "h-2.5 w-2.5 motion-safe:animate-spin" : "h-2.5 w-2.5";

  return (
    <span className={PILL_STYLE[state]} aria-label={`Status: ${PILL_LABEL[state]}`}>
      <Icon className={iconClass} aria-hidden="true" />
      {PILL_LABEL[state]}
    </span>
  );
}

function AgentRowHeader({ icon: Icon, title, state, summary, expanded, onToggle, rowId }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={`${rowId}-body`}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-120 hover:bg-surface-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2"
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-1 text-text-2"
        aria-hidden="true"
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-text-1">{title}</span>
          <StatePill state={state} />
        </span>
        <span className="block truncate text-xs text-text-3">{summary}</span>
      </span>
      {expanded ? (
        <ChevronDown className="h-4 w-4 shrink-0 text-text-3" aria-hidden="true" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-text-3" aria-hidden="true" />
      )}
    </button>
  );
}

function AgentRow({
  rowId,
  icon,
  title,
  state = AGENT_STATE.IDLE,
  summary = "",
  defaultExpanded = false,
  children,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <li className="border-b border-border-1 last:border-b-0">
      <AgentRowHeader
        icon={icon}
        title={title}
        state={state}
        summary={summary}
        expanded={expanded}
        onToggle={() => setExpanded((prev) => !prev)}
        rowId={rowId}
      />
      {expanded && (
        <div id={`${rowId}-body`} className="px-3 pb-4 pt-1">
          {children}
        </div>
      )}
    </li>
  );
}

export default AgentRow;
