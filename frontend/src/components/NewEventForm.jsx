/** Modal form for creating a new calendar event linked to an application. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import X from "lucide-react/dist/esm/icons/x";

import { useApplications } from "../hooks/useApplications";
import { useCreateEvent } from "../hooks/useCalendar";
import { EVENT_TYPE_OPTIONS } from "../lib/constants";
import { toISODate } from "../lib/dateUtils";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT_BASE, MODAL_CARD } from "../lib/designTokens";

function AppSelector({ apps, applicationId, onApplicationChange }) {
  const [appSearch, setAppSearch] = useState("");
  const initializedRef = useRef(false);

  useEffect(() => {
    if (applicationId && apps.length > 0 && !initializedRef.current) {
      const found = apps.find((a) => a.id === applicationId);
      if (found) {
        setAppSearch(`${found.company} — ${found.role_title}`);
        initializedRef.current = true;
      }
    }
  }, [applicationId, apps]);

  const filteredApps = useMemo(() => {
    if (!appSearch.trim()) return apps;
    const lower = appSearch.toLowerCase();
    return apps.filter(
      (a) =>
        a.company?.toLowerCase().includes(lower) ||
        a.role_title?.toLowerCase().includes(lower)
    );
  }, [apps, appSearch]);

  const handleSearchChange = useCallback((e) => {
    setAppSearch(e.target.value);
  }, []);

  const handleSelectChange = useCallback(
    (e) => {
      const selected = apps.find((a) => a.id === e.target.value);
      onApplicationChange(e.target.value);
      if (selected) setAppSearch(`${selected.company} — ${selected.role_title}`);
    },
    [apps, onApplicationChange]
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase text-slate-400" htmlFor="app-search">
        Application
      </label>
      <input
        id="app-search"
        type="text"
        placeholder="Search by company or role…"
        value={appSearch}
        onChange={handleSearchChange}
        className={`${INPUT_BASE}`}
        autoComplete="off"
      />
      <select
        value={applicationId}
        onChange={handleSelectChange}
        className={`${INPUT_BASE}`}
        aria-label="Select application"
        size={Math.min(filteredApps.length || 1, 5)}
      >
        {filteredApps.length === 0 && (
          <option value="" disabled>No matching applications</option>
        )}
        {filteredApps.map((a) => (
          <option key={a.id} value={a.id}>
            {a.company} — {a.role_title}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * NewEventForm renders a modal overlay with a calendar event creation form.
 *
 * Props:
 *   initialDate         {Date|null}   Pre-fill the date field.
 *   initialApplicationId {string|null} Pre-select an application.
 *   onClose             {function}    Called on success or cancel.
 */
function NewEventForm({ initialDate, initialApplicationId, onClose }) {
  const { data: appsEnvelope } = useApplications();
  const { mutate: createEvent, isPending } = useCreateEvent();

  const apps = useMemo(() => {
    if (!appsEnvelope) return [];
    return Array.isArray(appsEnvelope) ? appsEnvelope : (appsEnvelope?.data ?? []);
  }, [appsEnvelope]);

  const [applicationId, setApplicationId] = useState(initialApplicationId ?? "");
  const [eventType, setEventType] = useState(EVENT_TYPE_OPTIONS[0].value);
  const [date, setDate] = useState(() => (initialDate ? toISODate(initialDate) : ""));
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState(null);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!applicationId) {
        setFormError("Please select an application.");
        return;
      }
      if (!date) {
        setFormError("Please select a date.");
        return;
      }
      setFormError(null);
      createEvent(
        {
          application_id: applicationId,
          event_type: eventType,
          date,
          time: time || null,
          notes: notes || null,
        },
        { onSuccess: onClose }
      );
    },
    [applicationId, date, eventType, time, notes, createEvent, onClose]
  );

  const handleKeyDown = useCallback(
    (e) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleOverlayClick = useCallback(
    (e) => { if (e.currentTarget === e.target) onClose(); },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        className={`relative w-full max-w-md p-6 ${MODAL_CARD}`}
        role="dialog"
        aria-modal="true"
        aria-label="New calendar event"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">New Event</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-button p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AppSelector
            apps={apps}
            applicationId={applicationId}
            onApplicationChange={setApplicationId}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase text-slate-400" htmlFor="event-type">
              Event Type
            </label>
            <select
              id="event-type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className={`${INPUT_BASE}`}
            >
              {EVENT_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase text-slate-400" htmlFor="event-date">
              Date
            </label>
            <input
              id="event-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${INPUT_BASE}`}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase text-slate-400" htmlFor="event-time">
              Time{" "}
              <span className="font-normal normal-case text-slate-400">(optional)</span>
            </label>
            <input
              id="event-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={`${INPUT_BASE}`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase text-slate-400" htmlFor="event-notes">
              Notes{" "}
              <span className="font-normal normal-case text-slate-400">(optional)</span>
            </label>
            <textarea
              id="event-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`min-h-[80px] resize-y ${INPUT_BASE}`}
            />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`${BUTTON_SECONDARY} text-sm`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`${BUTTON_PRIMARY} text-sm`}
            >
              {isPending ? "Saving…" : "Save Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewEventForm;
