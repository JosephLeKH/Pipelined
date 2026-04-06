/** Calendar page: monthly interview event calendar with navigation. */

import { useState, useCallback } from "react";

import CalendarEventDetail from "../components/CalendarEventDetail";
import CalendarGrid from "../components/CalendarGrid";
import NewEventForm from "../components/NewEventForm";

function Calendar() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
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
    <main className="flex min-h-screen flex-col gap-6 bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
      <CalendarGrid
        month={month}
        year={year}
        onMonthChange={handleMonthChange}
        onEventClick={handleEventClick}
        onDayClick={handleDayClick}
      />
      {selectedEvent && (
        <CalendarEventDetail
          event={selectedEvent}
          onClose={handleCloseEventDetail}
        />
      )}
      {newEventForm && (
        <NewEventForm
          initialDate={newEventForm.date}
          initialApplicationId={newEventForm.applicationId}
          onClose={handleCloseForm}
        />
      )}
    </main>
  );
}

export default Calendar;
