/** Monthly calendar grid: day cells with event dots (PRD-06 §7.1). */

import { useMemo } from "react";

import { useCalendarEvents } from "../hooks/useCalendar";
import { CALENDAR_EVENT_DOT_MAX, WEEK_DAYS, WEEK_DAYS_FULL } from "../lib/constants";
import { toISODate, formatDateLong } from "../lib/dateUtils";
import ApiErrorMessage from "./ApiErrorMessage";
import SkeletonCalendarCell from "./SkeletonCalendarCell";

const CELL_FOCUS =
  "focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

/** Build a 6-week grid of Date objects anchored to the given month. */
function buildWeeks(month, year) {
  const firstOfMonth = new Date(year, month - 1, 1);
  const startDay = new Date(firstOfMonth);
  startDay.setDate(startDay.getDate() - startDay.getDay());

  const weeks = [];
  const cursor = new Date(startDay);
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function EventIndicator({ events }) {
  if (events.length === 0) return null;

  if (events.length === 1) {
    const event = events[0];
    return (
      <div className="mt-auto flex flex-col gap-0.5 pt-1">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-600 dark:bg-brand-500 flex-shrink-0" />
          <span className="text-[0.6875rem] font-medium leading-tight text-text-2 truncate">
            {event.title}
          </span>
        </div>
        {event.company && (
          <span className="text-[0.625rem] leading-tight text-text-3 truncate pl-2.5">
            {event.company}
          </span>
        )}
      </div>
    );
  }

  const visible = events.slice(0, CALENDAR_EVENT_DOT_MAX);
  return (
    <div className="mt-auto flex flex-wrap items-center gap-1 pt-1" aria-hidden="true">
      {visible.map((ev) => (
        <span key={ev.id} className="h-1.5 w-1.5 rounded-full bg-brand-600 dark:bg-brand-500" />
      ))}
      <span className="text-[0.625rem] font-medium leading-none text-text-3">
        {events.length > CALENDAR_EVENT_DOT_MAX ? `${visible.length}+` : events.length}
      </span>
    </div>
  );
}

function DayCell({ date, isCurrentMonth, events, selectedDate, onDayClick }) {
  const today = toISODate(new Date());
  const dateStr = toISODate(date);
  const isToday = dateStr === today;
  const isSelected = selectedDate === dateStr;
  const eventCount = events.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onDayClick(date)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onDayClick(date);
      }}
      aria-label={`${formatDateLong(date)}${eventCount ? `, ${eventCount} event${eventCount !== 1 ? "s" : ""}` : ""}`}
      aria-current={isToday ? "date" : undefined}
      aria-pressed={isSelected || undefined}
      data-date={dateStr}
      className={[
        "flex min-h-24 cursor-pointer flex-col border border-border-1 p-2",
        "motion-reduce:transition-none transition-colors duration-[120ms] ease-out hover:bg-surface-1",
        isCurrentMonth ? "bg-surface-0" : "bg-surface-1/40",
        isToday && "border-t-2 border-t-brand-600 dark:border-t-brand-500",
        isSelected && "bg-brand-50/40 dark:bg-brand-900/20",
        CELL_FOCUS,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={[
          "text-[0.6875rem] font-medium leading-none",
          isToday ? "text-brand-600 dark:text-brand-400" : isCurrentMonth ? "text-text-1" : "text-text-3",
        ].join(" ")}
      >
        {date.getDate()}
      </span>
      {eventCount > 0 && <EventIndicator events={events} />}
    </div>
  );
}

function useCalendarGridData(month, year) {
  const { data: eventsEnvelope, isLoading, error, refetch } = useCalendarEvents(month, year);

  const events = useMemo(() => {
    if (!eventsEnvelope) return [];
    return Array.isArray(eventsEnvelope) ? eventsEnvelope : eventsEnvelope.data ?? [];
  }, [eventsEnvelope]);

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of events) {
      const key = typeof ev.date === "string" ? ev.date.slice(0, 10) : toISODate(new Date(ev.date));
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const weeks = useMemo(() => buildWeeks(month, year), [month, year]);
  return { eventsByDate, weeks, isLoading, error, refetch };
}

function CalendarContent({ isLoading, error, refetch, weeks, eventsByDate, month, selectedDate, onDayClick }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-7">
        {weeks.flat().map((date) => (
          <SkeletonCalendarCell key={toISODate(date)} />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6">
        <ApiErrorMessage error={error} onRetry={refetch} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-7">
      {weeks.flat().map((date) => {
        const dateStr = toISODate(date);
        return (
          <DayCell
            key={dateStr}
            date={date}
            isCurrentMonth={date.getMonth() + 1 === month}
            events={eventsByDate[dateStr] ?? []}
            selectedDate={selectedDate}
            onDayClick={onDayClick}
          />
        );
      })}
    </div>
  );
}

/**
 * CalendarGrid renders a monthly grid of days with event dots.
 *
 * Props:
 *   month         {number}   1-indexed month (1–12)
 *   year          {number}   4-digit year
 *   selectedDate  {string}   ISO date (YYYY-MM-DD) for selected cell highlight
 *   onDayClick    {function} (date) => void — called when a day cell is clicked
 */
function CalendarGrid({ month, year, selectedDate, onDayClick }) {
  const { eventsByDate, weeks, isLoading, error, refetch } = useCalendarGridData(month, year);

  return (
    <div className="overflow-hidden rounded-lg border border-border-1 bg-surface-0">
      <div className="grid grid-cols-7 border-b border-border-1">
        {WEEK_DAYS.map((d, i) => (
          <div
            key={d}
            className="border-r border-border-1 py-2 text-center text-[0.6875rem] font-medium uppercase text-text-3 last:border-r-0"
          >
            <abbr title={WEEK_DAYS_FULL[i]} className="no-underline">
              {d}
            </abbr>
          </div>
        ))}
      </div>
      <CalendarContent
        isLoading={isLoading}
        error={error}
        refetch={refetch}
        weeks={weeks}
        eventsByDate={eventsByDate}
        month={month}
        selectedDate={selectedDate}
        onDayClick={onDayClick}
      />
    </div>
  );
}

export default CalendarGrid;
