/** Calendar events list — page view (PRD-06 §7.2) or application timeline view. */

import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";

import { useApplicationEvents, useDeleteEvent } from "../hooks/useCalendar";
import {
  CALENDAR_DEFAULT_DURATION_MIN,
  CALENDAR_UPCOMING_WINDOW_DAYS,
  DEFAULT_EVENT_COLOR,
  EVENT_TYPE_COLORS,
} from "../lib/constants";
import { formatDate, formatTime, toISODate } from "../lib/dateUtils";
import { Button } from "./ui/button";

const ROW_FOCUS =
  "focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

function parseEventDateTime(event) {
  const dateStr = typeof event.date === "string" ? event.date.slice(0, 10) : toISODate(new Date(event.date));
  const base = new Date(dateStr);
  if (event.time) {
    const [h, m] = event.time.split(":").map(Number);
    base.setHours(h, m, 0, 0);
  }
  return base;
}

function isWithinNext24Hours(event) {
  const eventAt = parseEventDateTime(event);
  const now = new Date();
  const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return eventAt >= now && eventAt <= cutoff;
}

function eventTitle(event) {
  if (event.title?.trim()) return event.title.trim();
  const company = event.company ?? "Event";
  const typeLabel = event.event_type.replace(/_/g, " ");
  return `${company} ${typeLabel}`;
}

function formatDuration(event) {
  const minutes = event.duration_minutes ?? CALENDAR_DEFAULT_DURATION_MIN;
  return `${minutes} min`;
}

function PageEventRow({ event, onOpen }) {
  const urgent = isWithinNext24Hours(event);
  const title = eventTitle(event);
  const dateStr = typeof event.date === "string" ? event.date.slice(0, 10) : toISODate(new Date(event.date));

  return (
    <li
      data-calendar-date={dateStr}
      className={[
        "flex h-10 items-center gap-3 border-b border-border-1 px-4",
        "motion-reduce:transition-none transition-colors duration-[120ms] hover:bg-surface-1",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 shrink-0 rounded-full",
          urgent ? "bg-brand-600 dark:bg-brand-500" : "bg-text-3",
        ].join(" ")}
        aria-hidden="true"
      />
      <span className="w-20 shrink-0 text-xs text-text-2">{event.time ? formatTime(event.time) : "All day"}</span>
      <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-text-1">{title}</span>
      <span className="w-14 shrink-0 text-right text-[0.6875rem] text-text-3">{formatDuration(event)}</span>
      <button
        type="button"
        onClick={() => onOpen(event)}
        className={[
          "shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300",
          ROW_FOCUS,
        ].join(" ")}
      >
        Open
      </button>
    </li>
  );
}

function dayHeaderLabel(dateStr, todayStr) {
  if (dateStr === todayStr) {
    return `Today, ${formatDate(dateStr)}`;
  }
  return formatDate(dateStr);
}

function groupPageSections(events, todayStr) {
  const byDate = {};
  for (const ev of events) {
    const key = typeof ev.date === "string" ? ev.date.slice(0, 10) : toISODate(new Date(ev.date));
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(ev);
  }

  const sortedDates = Object.keys(byDate).sort();
  const todayEvents = byDate[todayStr] ?? [];
  const weekEnd = new Date(todayStr);
  weekEnd.setDate(weekEnd.getDate() + CALENDAR_UPCOMING_WINDOW_DAYS);
  const weekEndStr = toISODate(weekEnd);

  const weekDates = sortedDates.filter((d) => d > todayStr && d <= weekEndStr);
  const weekEvents = weekDates.flatMap((d) => byDate[d]);
  const remainingDates = sortedDates.filter(
    (d) => d !== todayStr && !weekDates.includes(d)
  );

  return { todayEvents, weekEvents, remainingDates, byDate };
}

function PageCalendarEventsList({ events, onEventOpen }) {
  const todayStr = toISODate(new Date());
  const { todayEvents, weekEvents, remainingDates, byDate } = groupPageSections(events, todayStr);

  const renderGroup = (dateStr, groupEvents, heading) => (
    <section key={dateStr} id={`calendar-day-${dateStr}`} className="scroll-mt-4">
      <header className="flex items-baseline gap-2 border-b border-border-1 px-4 py-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-text-3">{heading}</h2>
        <span className="text-xs text-text-3">
          {groupEvents.length} event{groupEvents.length !== 1 ? "s" : ""}
        </span>
      </header>
      <ul aria-live="polite">
        {groupEvents.map((ev) => (
          <PageEventRow key={ev.id} event={ev} onOpen={onEventOpen} />
        ))}
      </ul>
    </section>
  );

  return (
    <div className="mt-6 rounded-lg border border-border-1 bg-surface-0" data-testid="calendar-page-events">
      {todayEvents.length > 0 &&
        renderGroup(todayStr, todayEvents, dayHeaderLabel(todayStr, todayStr))}
      {weekEvents.length > 0 && (
        <section id="calendar-week-upcoming" className="scroll-mt-4">
          <header className="flex items-baseline gap-2 border-b border-border-1 px-4 py-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-text-3">Upcoming this week</h2>
            <span className="text-xs text-text-3">
              {weekEvents.length} event{weekEvents.length !== 1 ? "s" : ""}
            </span>
          </header>
          <ul aria-live="polite">
            {weekEvents.map((ev) => (
              <PageEventRow key={ev.id} event={ev} onOpen={onEventOpen} />
            ))}
          </ul>
        </section>
      )}
      {remainingDates.map((dateStr) =>
        renderGroup(dateStr, byDate[dateStr], dayHeaderLabel(dateStr, todayStr))
      )}
    </div>
  );
}

function ApplicationCalendarEventsList({ applicationId, onAddEvent }) {
  const { data, isLoading } = useApplicationEvents(applicationId);
  const { mutate: deleteEvent } = useDeleteEvent();
  const events = Array.isArray(data) ? data : (data?.data ?? []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase text-text-3">Interviews & Events</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onAddEvent(applicationId)}
          className="gap-1 text-xs text-brand-600 hover:bg-brand-50 hover:text-brand-700 dark:text-brand-400"
          aria-label="Add event"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add Event
        </Button>
      </div>
      {isLoading && (
        <p className="text-xs text-text-3" role="status">
          Loading…
        </p>
      )}
      {!isLoading && events.length === 0 && (
        <p className="text-xs text-text-3" role="status">
          No events yet.
        </p>
      )}
      <ul className="flex flex-col gap-1" aria-live="polite">
        {events.map((ev) => {
          const colors = EVENT_TYPE_COLORS[ev.event_type] ?? DEFAULT_EVENT_COLOR;
          return (
            <li key={ev.id} className="flex items-center justify-between rounded border border-border-1 px-3 py-2">
              <div className="flex flex-col gap-0.5">
                <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                  {ev.event_type.replace("_", " ")}
                </span>
                <span className="text-xs text-text-3">
                  {ev.date}
                  {ev.time ? ` · ${ev.time}` : ""}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => deleteEvent(ev.id)}
                className="h-7 w-7 text-text-3 hover:bg-brand-50 hover:text-brand-700"
                aria-label={`Delete event: ${ev.event_type.replace("_", " ")} on ${ev.date}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * @param {"page"|"application"} [variant="application"]
 * @param {object[]} [events] — required when variant="page"
 * @param {function} [onEventOpen] — page variant only
 */
function CalendarEventsList({ variant = "application", events, onEventOpen, applicationId, onAddEvent }) {
  if (variant === "page") {
    return <PageCalendarEventsList events={events ?? []} onEventOpen={onEventOpen} />;
  }
  return <ApplicationCalendarEventsList applicationId={applicationId} onAddEvent={onAddEvent} />;
}

export default CalendarEventsList;
