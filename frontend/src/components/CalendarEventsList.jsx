/** Displays calendar events (interviews) linked to an application, with delete capability. */

import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";

import { useApplicationEvents, useDeleteEvent } from "../hooks/useCalendar";
import {
  EVENT_TYPE_COLORS,
  DEFAULT_EVENT_COLOR,
} from "../lib/constants";

function CalendarEventsList({ applicationId, onAddEvent }) {
  const { data, isLoading } = useApplicationEvents(applicationId);
  const { mutate: deleteEvent } = useDeleteEvent();

  const events = Array.isArray(data) ? data : (data?.data ?? []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium font-display uppercase text-gray-400 dark:text-gray-500">Interviews & Events</span>
        <button
          type="button"
          onClick={() => onAddEvent(applicationId)}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2 dark:hover:bg-brand-900/30"
          aria-label="Add event"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Event
        </button>
      </div>
      {isLoading && <p className="text-xs text-gray-400">Loading…</p>}
      {!isLoading && events.length === 0 && (
        <p className="text-xs text-gray-400">No events yet.</p>
      )}
      {events.map((ev) => {
        const colors = EVENT_TYPE_COLORS[ev.event_type] ?? DEFAULT_EVENT_COLOR;
        return (
          <div key={ev.id} className="flex items-center justify-between rounded border border-gray-100 px-3 py-2 dark:border-gray-700">
            <div className="flex flex-col gap-0.5">
              <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                {ev.event_type.replace("_", " ")}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {ev.date}{ev.time ? ` · ${ev.time}` : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => deleteEvent(ev.id)}
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:text-gray-400 dark:hover:bg-red-900/30"
              aria-label="Delete event"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default CalendarEventsList;
