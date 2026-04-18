/** Form state, submission, keyboard, and overlay handlers for NewEventForm. */

import { useCallback, useEffect, useMemo, useState } from "react";

import { useApplications } from "./useApplications";
import { useCreateEvent } from "./useCalendar";
import { EVENT_TYPE_OPTIONS } from "../lib/constants";
import { toISODate } from "../lib/dateUtils";

export function useNewEventForm({ initialDate, initialApplicationId, onClose }) {
  const { data: appsEnvelope } = useApplications();
  const { mutate: createEvent, isPending } = useCreateEvent();
  const apps = useMemo(
    () => (appsEnvelope ? (Array.isArray(appsEnvelope) ? appsEnvelope : (appsEnvelope?.data ?? [])) : []),
    [appsEnvelope]
  );
  const [applicationId, setApplicationId] = useState(initialApplicationId ?? "");
  const [eventType, setEventType] = useState(EVENT_TYPE_OPTIONS[0].value);
  const [date, setDate] = useState(() => (initialDate ? toISODate(initialDate) : ""));
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState(null);
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!applicationId) { setFormError("Please select an application."); return; }
      if (!date) { setFormError("Please select a date."); return; }
      setFormError(null);
      createEvent(
        { application_id: applicationId, event_type: eventType, date, time: time || null, notes: notes || null },
        { onSuccess: onClose }
      );
    },
    [applicationId, date, eventType, time, notes, createEvent, onClose]
  );
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
  const handleOverlayClick = useCallback(
    (e) => { if (e.currentTarget === e.target) onClose(); },
    [onClose]
  );
  return {
    apps, applicationId, setApplicationId, eventType, setEventType,
    date, setDate, time, setTime, notes, setNotes,
    formError, handleSubmit, handleOverlayClick, isPending,
  };
}
