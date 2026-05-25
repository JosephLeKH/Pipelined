/** Calendar page: monthly grid, grouped events list, detail drawer, and new-event modal (PRD-06 §7). */

import { useState, useCallback } from "react";

import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";

import ApiErrorMessage from "../components/ApiErrorMessage";
import CalendarEventDetail from "../components/CalendarEventDetail";
import CalendarEventsList from "../components/CalendarEventsList";
import CalendarGrid from "../components/CalendarGrid";
import EmptyState from "../components/EmptyState";
import NewEventForm from "../components/NewEventForm";
import { Button } from "../components/ui/button";
import { useCalendarEvents } from "../hooks/useCalendar";
import { toISODate } from "../lib/dateUtils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const NAV_BTN =
  "h-8 w-8 p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

function CalendarNav({ onPrev, onNext, onToday }) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onToday} aria-label="Jump to today">
        Today
      </Button>
      <Button type="button" variant="outline" size="icon" onClick={onPrev} aria-label="Previous month" className={NAV_BTN}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button type="button" variant="outline" size="icon" onClick={onNext} aria-label="Next month" className={NAV_BTN}>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function CalendarContent({
  month,
  year,
  events,
  eventsLoading,
  eventsError,
  eventsRefetch,
  selectedDate,
  selectedEvent,
  newEventForm,
  onMonthChange,
  onEventOpen,
  onDayClick,
  onCloseEventDetail,
  onCloseForm,
  onOpenNewEvent,
}) {
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
    <main className="flex-1 px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold text-text-1">
          Calendar
          <span className="ml-2 text-base font-normal text-text-3">
            · {MONTH_NAMES[month - 1]} {year}
          </span>
        </h1>
        <CalendarNav onPrev={handlePrev} onNext={handleNext} onToday={handleToday} />
      </div>

      {eventsError && <ApiErrorMessage error={eventsError} onRetry={eventsRefetch} />}

      <CalendarGrid month={month} year={year} selectedDate={selectedDate} onDayClick={onDayClick} />

      {!eventsLoading && !eventsError && events.length === 0 && (
        <EmptyState
          title="No interviews scheduled"
          description="Events will appear here when you schedule interviews for your applications."
          icon={CalendarDays}
          actionButton={{ label: "Schedule an event", onClick: onOpenNewEvent }}
        />
      )}

      {!eventsLoading && !eventsError && events.length > 0 && (
        <CalendarEventsList variant="page" events={events} onEventOpen={onEventOpen} />
      )}

      {selectedEvent && <CalendarEventDetail event={selectedEvent} onClose={onCloseEventDetail} />}
      {newEventForm && (
        <NewEventForm
          initialDate={newEventForm.date}
          initialApplicationId={newEventForm.applicationId}
          onClose={onCloseForm}
        />
      )}
    </main>
  );
}

function Calendar() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const { data: eventsEnv, isLoading: eventsLoading, error: eventsError, refetch: eventsRefetch } =
    useCalendarEvents(month, year);
  const events = eventsEnv?.data ?? [];
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [newEventForm, setNewEventForm] = useState(null);

  const handleMonthChange = useCallback((m, y) => {
    setMonth(m);
    setYear(y);
  }, []);

  const handleDayClick = useCallback((date) => {
    const dateStr = toISODate(date);
    setSelectedDate(dateStr);
    requestAnimationFrame(() => {
      const daySection = document.getElementById(`calendar-day-${dateStr}`);
      if (daySection) {
        daySection.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      document
        .querySelector(`[data-calendar-date="${dateStr}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handleOpenNewEvent = useCallback(() => {
    setNewEventForm({ date: toISODate(new Date()), applicationId: null });
  }, []);

  return (
    <CalendarContent
      month={month}
      year={year}
      events={events}
      eventsLoading={eventsLoading}
      eventsError={eventsError}
      eventsRefetch={eventsRefetch}
      selectedDate={selectedDate}
      selectedEvent={selectedEvent}
      newEventForm={newEventForm}
      onMonthChange={handleMonthChange}
      onEventOpen={setSelectedEvent}
      onDayClick={handleDayClick}
      onCloseEventDetail={() => setSelectedEvent(null)}
      onCloseForm={() => setNewEventForm(null)}
      onOpenNewEvent={handleOpenNewEvent}
    />
  );
}

export default Calendar;
