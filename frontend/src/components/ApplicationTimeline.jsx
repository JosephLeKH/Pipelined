/** Chronological timeline of stage transitions and calendar events for an application. */

import { useState } from "react";

import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Phone from "lucide-react/dist/esm/icons/phone";
import Code2 from "lucide-react/dist/esm/icons/code-2";
import Building2 from "lucide-react/dist/esm/icons/building-2";
import Users from "lucide-react/dist/esm/icons/users";
import Gift from "lucide-react/dist/esm/icons/gift";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";

import { useApplicationEvents } from "../hooks/useCalendar";
import {
  STAGE_COLORS,
  DEFAULT_STAGE_COLOR,
  EVENT_TYPE_COLORS,
  DEFAULT_EVENT_COLOR,
} from "../lib/constants";
import { formatDate } from "../lib/dateUtils";

const EVENT_ICONS = {
  phone_screen: Phone,
  technical: Code2,
  onsite: Building2,
  behavioral: Users,
  offer: Gift,
  other: CalendarDays,
};


function buildTimeline(stageHistory, events) {
  const stageNodes = (stageHistory ?? []).map((entry, i, arr) => ({
    kind: "stage",
    sortKey: new Date(entry.transitioned_at).getTime(),
    date: entry.transitioned_at,
    label: i === 0 ? entry.stage : `${arr[i - 1].stage} \u2192 ${entry.stage}`,
    stage: entry.stage,
  }));

  const eventNodes = events.map((ev) => ({
    kind: "event",
    sortKey: new Date(ev.date).getTime(),
    date: ev.date,
    eventType: ev.event_type,
    title: ev.title || ev.event_type.replace(/_/g, " "),
  }));

  return [...stageNodes, ...eventNodes].sort((a, b) => a.sortKey - b.sortKey);
}

function StageTimelineNode({ node }) {
  const colors = STAGE_COLORS[node.stage] ?? DEFAULT_STAGE_COLOR;
  return (
    <li className="flex items-start gap-3 pb-3" data-testid="timeline-stage-node">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${colors.dot}`} />
      <div>
        <p className="text-sm font-medium text-gray-800">{node.label}</p>
        <p className="text-xs text-gray-400">{formatDate(node.date)}</p>
      </div>
    </li>
  );
}

function EventTimelineNode({ node }) {
  const Icon = EVENT_ICONS[node.eventType] ?? CalendarDays;
  const colors = EVENT_TYPE_COLORS[node.eventType] ?? DEFAULT_EVENT_COLOR;
  return (
    <li className="flex items-start gap-3 pb-3" data-testid="timeline-event-node">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${colors.bg}`}
        aria-label={node.eventType.replace(/_/g, " ")}
      >
        <Icon className={`h-3 w-3 ${colors.text}`} />
      </span>
      <div>
        <p className="text-sm font-medium capitalize text-gray-800">{node.title}</p>
        <p className="text-xs text-gray-400">{formatDate(node.date)}</p>
      </div>
    </li>
  );
}

function ApplicationTimeline({ stageHistory, applicationId }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { data } = useApplicationEvents(applicationId);
  const events = Array.isArray(data) ? data : (data?.data ?? []);
  const nodes = buildTimeline(stageHistory, events);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center gap-1 text-xs font-medium uppercase text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-1"
        aria-expanded={isExpanded}
        aria-label="Toggle timeline"
      >
        {isExpanded
          ? <ChevronDown className="h-3.5 w-3.5" />
          : <ChevronRight className="h-3.5 w-3.5" />}
        Timeline
      </button>
      {isExpanded && (
        nodes.length === 0 ? (
          <p className="text-xs text-gray-400" data-testid="timeline-empty">
            No activity yet
          </p>
        ) : (
          <ol className="flex flex-col" data-testid="timeline">
            {nodes.map((node, i) =>
              node.kind === "stage"
                ? <StageTimelineNode key={`s-${i}`} node={node} />
                : <EventTimelineNode key={`e-${i}`} node={node} />
            )}
          </ol>
        )
      )}
    </div>
  );
}

export default ApplicationTimeline;
