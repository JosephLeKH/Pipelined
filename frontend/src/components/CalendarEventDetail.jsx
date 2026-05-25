/** Right drawer (480px) for calendar event details and prep checklist (PRD-06 §7.3). */

import { useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";

import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import X from "lucide-react/dist/esm/icons/x";

import { DetailSectionTitle } from "./DetailPanelSections";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { useUpdateEvent } from "../hooks/useCalendar";
import {
  CALENDAR_DEFAULT_DURATION_MIN,
  CALENDAR_EVENT_DRAWER_WIDTH_PX,
  CALENDAR_EVENT_PREP_ITEMS,
  DRAWER_ANIMATION_MS,
  EVENT_TYPE_LOCATION_LABELS,
  EVENT_TYPE_OPTIONS,
  INTERVIEW_EVENT_TYPES,
} from "../lib/constants";
import { BUTTON_GHOST, BUTTON_PRIMARY } from "../lib/designTokens";
import { formatDateShort, formatTime, toISODate } from "../lib/dateUtils";

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const CLOSE_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

function mergePrepChecklist(saved = []) {
  const savedById = new Map(saved.map((item) => [item.id, item]));
  return CALENDAR_EVENT_PREP_ITEMS.map((item) => savedById.get(item.id) ?? { ...item, checked: false });
}

function formatEventTypeLabel(eventType) {
  const match = EVENT_TYPE_OPTIONS.find((option) => option.value === eventType);
  if (match) return match.label;
  return eventType.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatEventLocation(event) {
  const base = EVENT_TYPE_LOCATION_LABELS[event.event_type] ?? "N/A";
  if (event.event_type === "phone_screen" && event.notes?.trim()) {
    return `${base} (${event.notes.trim()})`;
  }
  return base;
}

function formatTimeEnd(timeStr, durationMin) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + durationMin;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return formatTime(`${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`);
}

function formatEventSchedule(event) {
  const dateStr =
    typeof event.date === "string" ? event.date.slice(0, 10) : toISODate(new Date(event.date));
  const weekday = new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
  const datePart = formatDateShort(dateStr);
  if (!event.time) return `${weekday}, ${datePart}`;
  const duration = event.duration_minutes ?? CALENDAR_DEFAULT_DURATION_MIN;
  return `${weekday}, ${datePart} · ${formatTime(event.time)} – ${formatTimeEnd(event.time, duration)}`;
}

function eventDisplayTitle(event) {
  if (event.title?.trim()) return event.title.trim();
  const company = event.company ?? "Event";
  return `${company} ${formatEventTypeLabel(event.event_type).toLowerCase()}`;
}

function DrawerHeader({ title, schedule, onClose }) {
  return (
    <div className="flex shrink-0 items-start gap-3 border-b border-border-1 px-4 py-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="Close event details"
        className={`h-7 w-7 shrink-0 ${BUTTON_GHOST} ${CLOSE_FOCUS}`}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
      <div className="min-w-0 flex-1">
        <h2 id="calendar-event-heading" className="truncate text-base font-semibold text-text-1">
          {title}
        </h2>
        <p className="mt-1 text-sm text-text-2">{schedule}</p>
      </div>
    </div>
  );
}

function ApplicationLink({ applicationId, company, roleTitle }) {
  if (!applicationId || (!company && !roleTitle)) return null;
  const label = [company, roleTitle].filter(Boolean).join(" · ");
  return (
    <div className="border-b border-border-1 px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-wide text-text-3">Application</span>
      <Link
        to={`/dashboard?selected=${applicationId}`}
        className={[
          "mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700",
          "dark:text-brand-400 dark:hover:text-brand-300",
          CLOSE_FOCUS,
        ].join(" ")}
      >
        {label}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

function EventMetaFields({ typeLabel, location }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border-1 px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wide text-text-3">Type</span>
        <span className="text-sm text-text-1">{typeLabel}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wide text-text-3">Location</span>
        <span className="text-sm text-text-1">{location}</span>
      </div>
    </div>
  );
}

function EventPrepChecklist({ checklist, onToggle }) {
  return (
    <section className="px-4 py-4">
      <DetailSectionTitle>Prep checklist</DetailSectionTitle>
      <ul className="mt-2 flex flex-col gap-1">
        {checklist.map((item) => (
          <li key={item.id} className="flex items-start gap-2 py-0.5">
            <Checkbox
              id={`event-prep-${item.id}`}
              checked={item.checked}
              onCheckedChange={() => onToggle(item.id)}
              className="mt-0.5 shrink-0"
              aria-label={item.text}
            />
            <label
              htmlFor={`event-prep-${item.id}`}
              className={[
                "flex-1 cursor-pointer text-sm",
                item.checked ? "text-text-3 line-through" : "text-text-1",
              ].join(" ")}
            >
              {item.text}
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CalendarEventDetail({ event, onClose }) {
  const panelRef = useRef(null);
  const { mutate: updateEvent } = useUpdateEvent();
  const checklist = useMemo(
    () => mergePrepChecklist(event?.prep_checklist ?? event?.prep_data?.checklist ?? []),
    [event?.prep_checklist, event?.prep_data?.checklist]
  );

  useEffect(() => {
    const firstFocusable = panelRef.current?.querySelectorAll(FOCUSABLE_SELECTORS)?.[0];
    firstFocusable?.focus();
  }, [event?.id]);

  useEffect(() => {
    const handler = (eventKey) => {
      if (eventKey.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleToggleItem = useCallback(
    (itemId) => {
      const updated = checklist.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );
      updateEvent({ id: event.id, body: { prep_checklist: updated } });
    },
    [checklist, event?.id, updateEvent]
  );

  if (!event) return null;

  const showPrep = INTERVIEW_EVENT_TYPES.includes(event.event_type);
  const typeLabel = formatEventTypeLabel(event.event_type);
  const location = formatEventLocation(event);

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-11 z-40 flex justify-end transition-opacity motion-reduce:transition-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-event-heading"
      style={{ transitionDuration: `${DRAWER_ANIMATION_MS}ms` }}
    >
      <Button
        type="button"
        variant="ghost"
        className="absolute inset-0 h-full w-full rounded-none bg-black/30 backdrop-blur-sm hover:bg-black/30 motion-reduce:backdrop-blur-none"
        onClick={onClose}
        aria-label="Close event detail"
        tabIndex={-1}
      />
      <aside
        ref={panelRef}
        data-testid="calendar-event-detail"
        role="complementary"
        aria-label="Event details"
        className="relative flex h-full flex-col overflow-y-auto border-l border-border-1 bg-surface-0 shadow-modal motion-safe-drawer animate-slide-in-right dark:bg-surface-0"
        style={{
          width: CALENDAR_EVENT_DRAWER_WIDTH_PX,
          maxWidth: "100%",
          transitionDuration: `${DRAWER_ANIMATION_MS}ms`,
        }}
      >
        <DrawerHeader title={eventDisplayTitle(event)} schedule={formatEventSchedule(event)} onClose={onClose} />
        <ApplicationLink
          applicationId={event.application_id}
          company={event.company}
          roleTitle={event.role_title}
        />
        <EventMetaFields typeLabel={typeLabel} location={location} />
        {showPrep && <EventPrepChecklist checklist={checklist} onToggle={handleToggleItem} />}
        {event.application_id && (
          <div className="mt-auto border-t border-border-1 px-4 py-4">
            <Button asChild size="sm" className={`${BUTTON_PRIMARY} h-8 w-full dark:focus-visible:outline-1`}>
              <Link to={`/dashboard?selected=${event.application_id}`}>Open application</Link>
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}

export default CalendarEventDetail;
