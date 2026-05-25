/** Side drawer showing calendar event details and interview prep. */

import { useEffect, useRef, useCallback } from "react";

import X from "lucide-react/dist/esm/icons/x";

import { useUpdateEvent } from "../hooks/useCalendar";
import { EVENT_TYPE_COLORS, DEFAULT_EVENT_COLOR, INTERVIEW_EVENT_TYPES } from "../lib/constants";
import { formatDate, formatTime } from "../lib/dateUtils";
import { useAuth } from "../context/AuthContext";
import { PrepSection } from "./PrepSection";
import { Button } from "./ui/button";

const FOCUSABLE_SELECTORS = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function EventHeader({ event, colors, eventTypeLabel, timeDisplay, onClose }) {
  return (
    <div className="flex items-start justify-between border-b border-border px-6 py-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>{eventTypeLabel}</span>
        </div>
        <h2 className=" text-lg font-semibold text-foreground">{event.title || eventTypeLabel}</h2>
        <p className="text-sm text-muted-foreground">
          {formatDate(typeof event.date === "string" ? event.date.slice(0, 10) : event.date)}
          {timeDisplay && ` · ${timeDisplay}`}
        </p>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={onClose} className="ml-4 shrink-0" aria-label="Close event details">
        <X className="h-5 w-5" />
      </Button>
    </div>
  );
}

function EventApplicationInfo({ company, roleTitle }) {
  if (!company && !roleTitle) return null;
  return (
    <div className="border-b border-border px-6 py-3">
      <span className="text-xs font-medium uppercase text-muted-foreground">Application</span>
      <p className="mt-1 text-sm font-medium text-foreground">
        {company && <span>{company}</span>}
        {company && roleTitle && <span className="text-muted-foreground"> · </span>}
        {roleTitle && <span>{roleTitle}</span>}
      </p>
    </div>
  );
}

function CalendarEventDetail({ event, onClose }) {
  const panelRef = useRef(null);
  const { mutate: updateEvent } = useUpdateEvent();
  const { user } = useAuth();
  const userTimezone = user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  useEffect(() => {
    const firstFocusable = panelRef.current?.querySelectorAll(FOCUSABLE_SELECTORS)?.[0];
    firstFocusable?.focus();
  }, [event?.id]);
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
  const handlePrepChange = useCallback((prepData) => {
    updateEvent({ id: event.id, body: { prep_data: prepData } });
  }, [event?.id, updateEvent]);
  if (!event) return null;
  const colors = EVENT_TYPE_COLORS[event.event_type] ?? DEFAULT_EVENT_COLOR;
  const eventTypeLabel = event.event_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const timeDisplay = event.time ? `${formatTime(event.time)} (${userTimezone})` : null;
  const showPrep = INTERVIEW_EVENT_TYPES.includes(event.event_type);
  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <aside ref={panelRef} role="complementary" aria-label="Event details" className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col overflow-y-auto bg-card shadow-lg animate-slide-in-right">
        <EventHeader event={event} colors={colors} eventTypeLabel={eventTypeLabel} timeDisplay={timeDisplay} onClose={onClose} />
        <EventApplicationInfo company={event.company} roleTitle={event.role_title} />
        {showPrep && <PrepSection key={event.id} initialPrepData={event.prep_data ?? { notes: "", checklist: [], questions: [] }} onPrepChange={handlePrepChange} />}
      </aside>
    </>
  );
}

export default CalendarEventDetail;
