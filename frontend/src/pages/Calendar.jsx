/** Calendar page: monthly interview event calendar with navigation. */

import { useState, useCallback } from "react";

import CalendarGrid from "../components/CalendarGrid";
import DetailPanel from "../components/DetailPanel";
import { useApplication } from "../hooks/useApplications";

function Calendar() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [newEventDate, setNewEventDate] = useState(null);

  const { data: selectedApp } = useApplication(selectedAppId);

  const handleMonthChange = useCallback((m, y) => {
    setMonth(m);
    setYear(y);
  }, []);

  const handleEventClick = useCallback((event) => {
    setSelectedAppId(event.application_id);
    setNewEventDate(null);
  }, []);

  const handleDayClick = useCallback((date) => {
    // Pre-fill NewEventForm with the clicked date (US-030 will wire this up)
    setNewEventDate(date);
    setSelectedAppId(null);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedAppId(null);
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
      <DetailPanel application={selectedApp ?? null} onClose={handleClosePanel} />
      {/* NewEventForm (US-030) will be rendered here, pre-filled with newEventDate */}
      {newEventDate && (
        <p className="text-sm text-gray-400">
          New event form for {newEventDate.toLocaleDateString()} — coming in US-030.
        </p>
      )}
    </main>
  );
}

export default Calendar;
