/** Calendar page: monthly interview event calendar with navigation. */

import { useState, useCallback } from "react";

import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";
import ApiErrorMessage from "../components/ApiErrorMessage";
import CalendarEventDetail from "../components/CalendarEventDetail";
import CalendarGrid from "../components/CalendarGrid";
import EmptyState from "../components/EmptyState";
import NavBar from "../components/NavBar";
import NewEventForm from "../components/NewEventForm";
import { useCalendarEvents } from "../hooks/useCalendar";

function CalendarContent({ month, year, events, eventsLoading, eventsError, eventsRefetch, selectedEvent, newEventForm, onMonthChange, onEventClick, onDayClick, onCloseEventDetail, onCloseForm }) {
  return (
    <main className="flex-1 px-4 sm:px-6 py-6">
      <h1 className="mb-6 font-display text-2xl font-semibold text-foreground">Calendar</h1>
      {eventsError && <ApiErrorMessage error={eventsError} onRetry={eventsRefetch} />}
      <CalendarGrid
        month={month}
        year={year}
        onMonthChange={onMonthChange}
        onEventClick={onEventClick}
        onDayClick={onDayClick}
      />
      {!eventsLoading && !eventsError && events.length === 0 && (
        <EmptyState
          title="No interviews scheduled"
          description="Events will appear here when you schedule interviews for your applications."
          icon={CalendarDays}
          actionButton={{ label: "Schedule an event", onClick: () => onDayClick(new Date().toISOString().slice(0, 10)) }}
        />
      )}
      {selectedEvent && (
        <CalendarEventDetail
          event={selectedEvent}
          onClose={onCloseEventDetail}
        />
      )}
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
  const { data: eventsEnv, isLoading: eventsLoading, error: eventsError, refetch: eventsRefetch } = useCalendarEvents(month, year);
  const events = eventsEnv?.data ?? [];
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [newEventForm, setNewEventForm] = useState(null);
  const handleMonthChange = useCallback((m, y) => { setMonth(m); setYear(y); }, []);
  const handleDayClick = useCallback((date) => setNewEventForm({ date, applicationId: null }), []);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavBar />
      <CalendarContent
        month={month}
        year={year}
        events={events}
        eventsLoading={eventsLoading}
        eventsError={eventsError}
        eventsRefetch={eventsRefetch}
        selectedEvent={selectedEvent}
        newEventForm={newEventForm}
        onMonthChange={handleMonthChange}
        onEventClick={setSelectedEvent}
        onDayClick={handleDayClick}
        onCloseEventDetail={() => setSelectedEvent(null)}
        onCloseForm={() => setNewEventForm(null)}
      />
    </div>
  );
}

export default Calendar;
