/** Monthly calendar grid: renders days, event chips, and navigation controls. */

import { useCallback, useMemo } from "react";

import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";

import { useCalendarEvents } from "../hooks/useCalendar";
import { DEFAULT_EVENT_COLOR, EVENT_TYPE_COLORS, WEEK_DAYS } from "../lib/constants";
import ApiErrorMessage from "./ApiErrorMessage";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

/** ISO date string (YYYY-MM-DD) from a Date object using local time. */
function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function EventChip({ event, onEventClick }) {
  const colors = EVENT_TYPE_COLORS[event.event_type] ?? DEFAULT_EVENT_COLOR;
  const label = `${event.company ?? "Unknown"} · ${event.event_type.replace(/_/g, " ")}`;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
      className={`w-full truncate rounded px-1 py-0.5 text-left text-xs font-medium ${colors.bg} ${colors.text} hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500`}
      title={label}
      aria-label={label}
    >
      {label}
    </button>
  );
}

function DayCell({ date, isCurrentMonth, events, onDayClick, onEventClick }) {
  const today = toISODate(new Date());
  const dateStr = toISODate(date);
  const isToday = dateStr === today;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onDayClick(date)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onDayClick(date); }}
      aria-label={date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      className={`min-h-[80px] cursor-pointer border border-gray-100 p-1.5 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:border-gray-700 dark:hover:bg-gray-700 ${
        isCurrentMonth ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900"
      }`}
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
          isToday
            ? "bg-blue-600 text-white"
            : isCurrentMonth
            ? "text-gray-900 dark:text-gray-100"
            : "text-gray-400 dark:text-gray-500"
        }`}
      >
        {date.getDate()}
      </span>
      <div className="mt-1 flex flex-col gap-0.5">
        {events.map((ev) => (
          <EventChip key={ev.id} event={ev} onEventClick={onEventClick} />
        ))}
      </div>
    </div>
  );
}

function CalendarHeader({ month, year, onPrev, onNext, onToday }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {MONTH_NAMES[month - 1]} {year}
      </h2>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToday}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous month"
          className="rounded border border-gray-300 p-1.5 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next month"
          className="rounded border border-gray-300 p-1.5 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * CalendarGrid renders a monthly grid of days with event chips.
 *
 * Props:
 *   month        {number}   1-indexed month (1–12)
 *   year         {number}   4-digit year
 *   onMonthChange {function} (month, year) => void — called on nav
 *   onEventClick  {function} (event) => void — called when a chip is clicked
 *   onDayClick    {function} (date) => void — called when an empty day is clicked
 */
function CalendarGrid({ month, year, onMonthChange, onEventClick, onDayClick }) {
  const { data: eventsEnvelope, isLoading, error, refetch } = useCalendarEvents(month, year);

  // Backend returns { data: [...], meta: { count } }
  const events = useMemo(() => {
    if (!eventsEnvelope) return [];
    const list = Array.isArray(eventsEnvelope) ? eventsEnvelope : eventsEnvelope.data ?? [];
    return list;
  }, [eventsEnvelope]);

  // Group events by ISO date for O(1) day lookup
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

  const handlePrev = useCallback(() => {
    const prev = month === 1 ? { m: 12, y: year - 1 } : { m: month - 1, y: year };
    onMonthChange(prev.m, prev.y);
  }, [month, year, onMonthChange]);

  const handleNext = useCallback(() => {
    const next = month === 12 ? { m: 1, y: year + 1 } : { m: month + 1, y: year };
    onMonthChange(next.m, next.y);
  }, [month, year, onMonthChange]);

  const handleToday = useCallback(() => {
    const now = new Date();
    onMonthChange(now.getMonth() + 1, now.getFullYear());
  }, [onMonthChange]);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <CalendarHeader
        month={month}
        year={year}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
      />
      <div className="grid grid-cols-7 border-t border-gray-200 dark:border-gray-700">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="border-b border-gray-200 py-2 text-center text-xs font-medium uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
            {d}
          </div>
        ))}
      </div>
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          Loading events…
        </div>
      ) : error ? (
        <div className="p-6">
          <ApiErrorMessage error={error} onRetry={refetch} />
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {weeks.flat().map((date) => {
            const dateStr = toISODate(date);
            const isCurrentMonth = date.getMonth() + 1 === month;
            return (
              <DayCell
                key={dateStr}
                date={date}
                isCurrentMonth={isCurrentMonth}
                events={eventsByDate[dateStr] ?? []}
                onDayClick={onDayClick}
                onEventClick={onEventClick}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CalendarGrid;
