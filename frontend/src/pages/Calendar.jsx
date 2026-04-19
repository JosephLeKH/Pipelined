/** Calendar page: monthly interview event calendar with navigation. */

import { useState, useCallback } from "react";

import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";
import CalendarEventDetail from "../components/CalendarEventDetail";
import CalendarGrid from "../components/CalendarGrid";
import EmptyState from "../components/EmptyState";
import NavBar from "../components/NavBar";
import NewEventForm from "../components/NewEventForm";
import { useCalendarEvents } from "../hooks/useCalendar";

function CalendarContent({ month, year, events, eventsLoading, selectedEvent, newEventForm, onMonthChange, onEventClick, onDayClick, onCloseEventDetail, onCloseForm }) {
  return (
    <main className="flex-1 p-6">
      <h1 className="mb-6 text-xl font-semibold text-slate-900 dark:text-slate-100">Calendar</h1>
      <CalendarGrid
        month={month}
        year={year}
        onMonthChange={onMonthChange}
        onEventClick={onEventClick}
        onDayClick={onDayClick}
      />
      {!eventsLoading && events.length === 0 && (
        <EmptyState
          title="No interviews scheduled"
          description="Events will appear here when you schedule interviews for your applications."
          icon={CalendarDays}
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

  const { data: eventsEnv, isLoading: eventsLoading } = useCalendarEvents(month, year);
  const events = eventsEnv?.data ?? [];
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [newEventForm, setNewEventForm] = useState(null);

  const handleMonthChange = useCallback((m, y) => {
    setMonth(m);
    setYear(y);
  }, []);

  const handleEventClick = useCallback((event) => {
    setSelectedEvent(event);
  }, []);

  const handleDayClick = useCallback((date) => {
    setNewEventForm({ date, applicationId: null });
  }, []);

  const handleCloseEventDetail = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  const handleCloseForm = useCallback(() => {
    setNewEventForm(null);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <NavBar />
      <CalendarContent
        month={month}
        year={year}
        events={events}
        eventsLoading={eventsLoading}
        selectedEvent={selectedEvent}
        newEventForm={newEventForm}
        onMonthChange={handleMonthChange}
        onEventClick={handleEventClick}
        onDayClick={handleDayClick}
        onCloseEventDetail={handleCloseEventDetail}
        onCloseForm={handleCloseForm}
      />
    </div>
  );
}

export default Calendar;
