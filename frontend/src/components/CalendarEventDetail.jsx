/** Side drawer showing calendar event details and interview prep. */

import { useEffect, useRef, useCallback } from "react";

import X from "lucide-react/dist/esm/icons/x";

import { useUpdateEvent } from "../hooks/useCalendar";
import { EVENT_TYPE_COLORS, DEFAULT_EVENT_COLOR, INTERVIEW_EVENT_TYPES } from "../lib/constants";
import { formatDate, formatTime } from "../lib/dateUtils";
import { useAuth } from "../context/AuthContext";
import { PrepSection } from "./PrepSection";
import { BUTTON_GHOST } from "../lib/designTokens";

const FOCUSABLE_SELECTORS = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * CalendarEventDetail — side drawer for a single calendar event.
 *
 * Props:
 *   event   {object}    The calendar event object (from the list/PATCH response)
 *   onClose {function}  Called when the drawer should be closed
 */
function CalendarEventDetail({ event, onClose }) {
  const panelRef = useRef(null);
  const { mutate: updateEvent } = useUpdateEvent();
  const { user } = useAuth();
  const userTimezone = user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Focus trap
  useEffect(() => {
    const firstFocusable = panelRef.current?.querySelectorAll(FOCUSABLE_SELECTORS)?.[0];
    firstFocusable?.focus();
  }, [event?.id]);

  // Escape key closes panel
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
  const formattedTime = event.time ? formatTime(event.time) : null;
  const timeDisplay = formattedTime ? `${formattedTime} (${userTimezone})` : null;
  const showPrep = INTERVIEW_EVENT_TYPES.includes(event.event_type);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        ref={panelRef}
        role="complementary"
        aria-label="Event details"
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-modal dark:bg-gray-800 animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-default px-6 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={`rounded-badge px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                {eventTypeLabel}
              </span>
            </div>
            <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100">
              {event.title || eventTypeLabel}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(
                typeof event.date === "string" ? event.date.slice(0, 10) : event.date
              )}
              {timeDisplay && ` · ${timeDisplay}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`ml-4 ${BUTTON_GHOST} p-2`}
            aria-label="Close event details"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Application info */}
        {(event.company || event.role_title) && (
          <div className="border-b border-gray-100 dark:border-gray-700 px-6 py-3">
            <span className="text-xs font-medium uppercase text-gray-400">Application</span>
            <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-200">
              {event.company && <span>{event.company}</span>}
              {event.company && event.role_title && <span className="text-gray-400"> · </span>}
              {event.role_title && <span>{event.role_title}</span>}
            </p>
          </div>
        )}

        {/* Interview Prep */}
        {showPrep && (
          <PrepSection
            key={event.id}
            initialPrepData={event.prep_data ?? { notes: "", checklist: [], questions: [] }}
            onPrepChange={handlePrepChange}
          />
        )}
      </aside>
    </>
  );
}

export default CalendarEventDetail;
