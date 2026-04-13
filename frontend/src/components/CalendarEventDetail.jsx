/** Side drawer showing calendar event details, prep notes, and prep checklist. */

import { useState, useEffect, useRef, useCallback } from "react";

import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import X from "lucide-react/dist/esm/icons/x";

import { useUpdateEvent } from "../hooks/useCalendar";
import { EVENT_TYPE_COLORS, DEFAULT_EVENT_COLOR, PREP_NOTES_MAX_LENGTH, PREP_NOTES_DEBOUNCE_MS } from "../lib/constants";
import { INPUT_BASE } from "../lib/designTokens";
import { formatDate, formatTime } from "../lib/dateUtils";
import { useAuth } from "../context/AuthContext";

const FOCUSABLE_SELECTORS = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function ChecklistItem({ item, onToggle, onDelete }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <input
        type="checkbox"
        id={`checklist-item-${item.id}`}
        checked={item.checked}
        onChange={() => onToggle(item.id)}
        className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        aria-label={item.text}
      />
      <label
        htmlFor={`checklist-item-${item.id}`}
        className={`flex-1 cursor-pointer text-sm ${item.checked ? "text-slate-400 line-through" : "text-slate-700"}`}
      >
        {item.text}
      </label>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="flex-shrink-0 rounded p-0.5 text-gray-300 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-400"
        aria-label={`Delete checklist item: ${item.text}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AddChecklistItem({ onAdd }) {
  const [text, setText] = useState("");

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = text.trim();
      if (trimmed) {
        onAdd(trimmed);
        setText("");
      }
    }
  }, [text, onAdd]);

  return (
    <div className="flex items-center gap-2 pt-1">
      <Plus className="h-4 w-4 flex-shrink-0 text-slate-400" />
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add item and press Enter"
        className={`flex-1 border border-slate-200 bg-white rounded-input px-2 py-1 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100`}
        aria-label="New checklist item"
        maxLength={200}
      />
    </div>
  );
}

/**
 * CalendarEventDetail — side drawer for a single calendar event.
 *
 * Props:
 *   event   {object}    The calendar event object (from the list/PATCH response)
 *   onClose {function}  Called when the drawer should be closed
 */
function CalendarEventDetail({ event, onClose }) {
  const [localNotes, setLocalNotes] = useState(event?.prep_notes ?? "");
  const [checklist, setChecklist] = useState(event?.prep_checklist ?? []);
  const debounceRef = useRef(null);
  const panelRef = useRef(null);
  const { mutate: updateEvent } = useUpdateEvent();
  const { user } = useAuth();
  const userTimezone = user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Sync local state when event changes (e.g. different event opened)
  useEffect(() => {
    setLocalNotes(event?.prep_notes ?? "");
    setChecklist(event?.prep_checklist ?? []);
  }, [event?.id]);

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

  const handleNotesChange = useCallback((e) => {
    const val = e.target.value;
    setLocalNotes(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateEvent({ id: event.id, body: { prep_notes: val } });
    }, PREP_NOTES_DEBOUNCE_MS);
  }, [event?.id, updateEvent]);

  const handleAddItem = useCallback((text) => {
    const newItem = { id: crypto.randomUUID(), text, checked: false };
    const updated = [...checklist, newItem];
    setChecklist(updated);
    updateEvent({ id: event.id, body: { prep_checklist: updated } });
  }, [checklist, event?.id, updateEvent]);

  const handleToggleItem = useCallback((itemId) => {
    const updated = checklist.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setChecklist(updated);
    updateEvent({ id: event.id, body: { prep_checklist: updated } });
  }, [checklist, event?.id, updateEvent]);

  const handleDeleteItem = useCallback((itemId) => {
    const updated = checklist.filter((item) => item.id !== itemId);
    setChecklist(updated);
    updateEvent({ id: event.id, body: { prep_checklist: updated } });
  }, [checklist, event?.id, updateEvent]);

  if (!event) return null;

  const colors = EVENT_TYPE_COLORS[event.event_type] ?? DEFAULT_EVENT_COLOR;
  const eventTypeLabel = event.event_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const formattedTime = event.time ? formatTime(event.time) : null;
  const timeDisplay = formattedTime ? `${formattedTime} (${userTimezone})` : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        ref={panelRef}
        role="complementary"
        aria-label="Event details"
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-modal dark:bg-slate-800 animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={`rounded-badge px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                {eventTypeLabel}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {event.title || eventTypeLabel}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatDate(
                typeof event.date === "string" ? event.date.slice(0, 10) : event.date
              )}
              {timeDisplay && ` · ${timeDisplay}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label="Close event details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Application info */}
        {(event.company || event.role_title) && (
          <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-3">
            <span className="text-xs font-medium uppercase text-slate-400">Application</span>
            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
              {event.company && <span>{event.company}</span>}
              {event.company && event.role_title && <span className="text-slate-400"> · </span>}
              {event.role_title && <span>{event.role_title}</span>}
            </p>
          </div>
        )}

        {/* Prep notes */}
        <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-4">
          <label htmlFor="prep-notes" className="text-xs font-medium uppercase text-slate-400">
            Prep Notes
          </label>
          <textarea
            id="prep-notes"
            value={localNotes}
            onChange={handleNotesChange}
            maxLength={PREP_NOTES_MAX_LENGTH}
            placeholder="Add your prep notes here…"
            rows={4}
            className={`mt-2 w-full resize-none border border-slate-200 bg-white rounded-input px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100`}
          />
          <p className="mt-1 text-right text-xs text-slate-400">
            {localNotes.length} / {PREP_NOTES_MAX_LENGTH}
          </p>
        </div>

        {/* Checklist */}
        <div className="flex-1 px-6 py-4">
          <span className="text-xs font-medium uppercase text-slate-400">Prep Checklist</span>
          <div className="mt-2 flex flex-col gap-0.5">
            {checklist.map((item) => (
              <ChecklistItem
                key={item.id}
                item={item}
                onToggle={handleToggleItem}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>
          <AddChecklistItem onAdd={handleAddItem} />
        </div>
      </aside>
    </>
  );
}

export default CalendarEventDetail;
