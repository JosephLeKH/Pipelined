/** Monthly calendar grid: renders days, event chips, and navigation controls. */

import { useCallback, useMemo } from "react";

import BookOpen from "lucide-react/dist/esm/icons/book-open";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";

import { useCalendarEvents } from "../hooks/useCalendar";
import { DEFAULT_EVENT_COLOR, EVENT_TYPE_COLORS, WEEK_DAYS } from "../lib/constants";
import { toISODate, formatDateLong, formatTime } from "../lib/dateUtils";
import { Button } from "./ui/button";
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
      className={`flex w-full items-center gap-1 truncate rounded-full border px-2 py-0.5 text-left text-xs font-medium ${colors.bg} ${colors.text} ${colors.border} hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
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
      className={`min-h-[48px] cursor-pointer border border-border p-1.5 transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring md:min-h-[80px] ${
        isCurrentMonth ? "bg-card" : "bg-muted/50"
      }`}
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
          isToday
            ? "bg-primary/10 text-primary"
            : isCurrentMonth
            ? "text-foreground"
            : "text-muted-foreground"
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
      <h2 className="font-display text-xl font-semibold text-foreground">
        {MONTH_NAMES[month - 1]} {year}
      </h2>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onToday}>
          Today
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          aria-label="Previous month"
          className="p-1.5 h-auto"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onNext}
          aria-label="Next month"
          className="p-1.5 h-auto"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
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

function CalendarContent({ isLoading, error, refetch, weeks, eventsByDate, month, onDayClick, onEventClick }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-7">
        {weeks.flat().map((date) => <SkeletonCalendarCell key={toISODate(date)} />)}
      </div>
    );
  }
  if (error) {
    return <div className="p-6"><ApiErrorMessage error={error} onRetry={refetch} /></div>;
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
            onDayClick={onDayClick}
            onEventClick={onEventClick}
          />
        );
      })}
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
  const { eventsByDate, weeks, isLoading, error, refetch } = useCalendarGridData(month, year);

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
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <CalendarHeader month={month} year={year} onPrev={handlePrev} onNext={handleNext} onToday={handleToday} />
      <div className="grid grid-cols-7 border-t border-border">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="border-b border-border py-2 text-center text-xs font-display font-medium uppercase text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <CalendarContent
        isLoading={isLoading} error={error} refetch={refetch}
        weeks={weeks} eventsByDate={eventsByDate} month={month}
        onDayClick={onDayClick} onEventClick={onEventClick}
      />
    </div>
  );
}

export default CalendarGrid;
