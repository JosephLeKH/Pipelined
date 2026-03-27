/** Calendar page: monthly interview event calendar with navigation. */

import { useState, useCallback } from "react";

import CalendarGrid from "../components/CalendarGrid";
import DetailPanel from "../components/DetailPanel";
import NewEventForm from "../components/NewEventForm";
import { useApplication } from "../hooks/useApplications";

function Calendar() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [newEventForm, setNewEventForm] = useState(null);

  const { data: selectedApp } = useApplication(selectedAppId);

  const handleMonthChange = useCallback((m, y) => {
    setMonth(m);
    setYear(y);
  }, []);

  const handleEventClick = useCallback((event) => {
    setSelectedAppId(event.application_id);
  }, []);

  const handleDayClick = useCallback((date) => {
    setNewEventForm({ date, applicationId: null });
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedAppId(null);
  }, []);

  const handleAddEvent = useCallback((applicationId) => {
    setNewEventForm({ date: null, applicationId });
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
      <DetailPanel
        application={selectedApp ?? null}
        onClose={handleClosePanel}
        onAddEvent={handleAddEvent}
      />
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
