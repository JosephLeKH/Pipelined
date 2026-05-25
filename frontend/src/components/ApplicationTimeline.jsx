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
import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { formatDateShort } from "../lib/dateUtils";
import { Button } from "./ui/button";

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
    label: i === 0 ? entry.stage : `${arr[i - 1].stage} → ${entry.stage}`,
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

function TimelineDot({ color, showLine }) {
  return (
    <div className="relative flex w-3 shrink-0 flex-col items-center">
      <span
        className="relative z-10 mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {showLine && (
        <span className="absolute top-3 h-[calc(100%-4px)] w-px bg-border-1" aria-hidden="true" />
      )}
    </div>
  );
}

function StageTimelineNode({ node, showLine }) {
  const colors = STAGE_COLORS[node.stage] ?? DEFAULT_STAGE_COLOR;
  return (
    <li className="flex min-h-[2rem] gap-3" data-testid="timeline-stage-node">
      <TimelineDot color={colors.dotColor} showLine={showLine} />
      <div className="min-w-0 pb-3">
        <p className="text-xs text-text-1">
          <span className="font-medium">{node.label}</span>
          <span className="text-text-3"> · </span>
          <span className="text-text-3">{formatDateShort(node.date)}</span>
        </p>
      </div>
    </li>
  );
}

function EventTimelineNode({ node, showLine }) {
  const Icon = EVENT_ICONS[node.eventType] ?? CalendarDays;
  return (
    <li className="flex min-h-[2rem] gap-3" data-testid="timeline-event-node">
      <div className="relative flex w-3 shrink-0 flex-col items-center">
        <Icon className="relative z-10 mt-0.5 h-3.5 w-3.5 shrink-0 text-text-3" aria-hidden="true" />
        {showLine && (
          <span className="absolute top-4 h-[calc(100%-8px)] w-px bg-border-1" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 pb-3">
        <p className="text-xs capitalize text-text-1">
          <span className="font-medium">{node.title}</span>
          <span className="text-text-3"> · </span>
          <span className="text-text-3">{formatDateShort(node.date)}</span>
        </p>
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
      <Button
        type="button"
        variant="ghost"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="h-auto gap-1 p-0 text-xs font-medium uppercase text-text-3 hover:bg-transparent hover:text-text-1 motion-reduce:transition-none transition-colors duration-hover ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
        aria-expanded={isExpanded}
        aria-controls={`timeline-panel-${applicationId}`}
        aria-label="Toggle timeline entries"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Activity
      </Button>
      {isExpanded && (
        <div id={`timeline-panel-${applicationId}`}>
          {nodes.length === 0 ? (
            <p className="text-xs text-text-3" data-testid="timeline-empty" role="status">
              No activity yet
            </p>
          ) : (
            <ol className="flex flex-col" data-testid="timeline" aria-live="polite" aria-label="Application timeline">
              {nodes.map((node, i) => {
                const showLine = i < nodes.length - 1;
                return node.kind === "stage" ? (
                  <StageTimelineNode key={`s-${i}`} node={node} showLine={showLine} />
                ) : (
                  <EventTimelineNode key={`e-${i}`} node={node} showLine={showLine} />
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

export default ApplicationTimeline;
