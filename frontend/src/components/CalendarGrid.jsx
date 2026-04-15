/** Monthly calendar grid: renders days, event chips, and navigation controls. */

import { useCallback, useMemo } from "react";

import BookOpen from "lucide-react/dist/esm/icons/book-open";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";

import { useCalendarEvents } from "../hooks/useCalendar";
import { DEFAULT_EVENT_COLOR, EVENT_TYPE_COLORS, WEEK_DAYS } from "../lib/constants";
import { toISODate, formatDateLong, formatTime } from "../lib/dateUtils";
import ApiErrorMessage from "./ApiErrorMessage";
import SkeletonCalendarCell from "./SkeletonCalendarCell";

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


function EventChip({ event, onEventClick }) {
  const colors = EVENT_TYPE_COLORS[event.event_type] ?? DEFAULT_EVENT_COLOR;
  const timeStr = event.time ? ` · ${formatTime(event.time)}` : "";
  const label = `${event.company ?? "Unknown"} · ${event.event_type.replace(/_/g, " ")}${timeStr}`;
  const hasPrepData = Boolean(
    event.prep_data?.notes?.trim() ||
    event.prep_data?.checklist?.length ||
    event.prep_data?.questions?.length
  );
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
      className={`flex w-full items-center gap-1 truncate rounded-full px-1.5 py-0.5 text-left text-xs font-medium ${colors.bg} ${colors.text} hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-brand-500`}
      title={label}
      aria-label={label}
    >
      <span className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${colors.dot}`} aria-hidden="true" />
      <span className="truncate">{label}</span>
      {hasPrepData && (
        <BookOpen className="h-3 w-3 flex-shrink-0 ml-auto" aria-label="Has prep data" />
      )}
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
      aria-label={formatDateLong(date)}
      className={`min-h-[48px] cursor-pointer border border-slate-100 p-1.5 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 dark:border-slate-700 dark:hover:bg-slate-700 md:min-h-[80px] ${
        isCurrentMonth ? "bg-white dark:bg-slate-800" : "bg-slate-50 dark:bg-slate-900"
      }`}
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
          isToday
            ? "bg-brand-600 text-white"
            : isCurrentMonth
            ? "text-slate-900 dark:text-slate-100"
            : "text-slate-400 dark:text-slate-500"
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
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        {MONTH_NAMES[month - 1]} {year}
      </h2>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToday}
          className="rounded-button border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-1"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous month"
          className="rounded-button border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-1"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next month"
          className="rounded-button border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-1"
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
    <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800">
      <CalendarHeader
        month={month}
        year={year}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
      />
      <div className="grid grid-cols-7 border-t border-slate-200 dark:border-slate-700">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="border-b border-slate-200 py-2 text-center text-xs font-medium uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {d}
          </div>
        ))}
      </div>
      {isLoading ? (
        <div className="grid grid-cols-7">
          {weeks.flat().map((date) => (
            <SkeletonCalendarCell key={toISODate(date)} />
          ))}
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
