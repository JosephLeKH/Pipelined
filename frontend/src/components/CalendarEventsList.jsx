/** Displays calendar events (interviews) linked to an application, with delete capability. */

import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";

import { useApplicationEvents, useDeleteEvent } from "../hooks/useCalendar";
import {
  EVENT_TYPE_COLORS,
  DEFAULT_EVENT_COLOR,
} from "../lib/constants";
import { Button } from "./ui/button";

function CalendarEventsList({ applicationId, onAddEvent }) {
  const { data, isLoading } = useApplicationEvents(applicationId);
  const { mutate: deleteEvent } = useDeleteEvent();

  const events = Array.isArray(data) ? data : (data?.data ?? []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium font-display uppercase text-muted-foreground">Interviews & Events</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onAddEvent(applicationId)}
          className="text-xs text-primary hover:bg-primary/10 hover:text-primary gap-1"
          aria-label="Add event"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Event
        </Button>
      </div>
      {isLoading && <p className="text-xs text-muted-foreground" role="status">Loading…</p>}
      {!isLoading && events.length === 0 && (
        <p className="text-xs text-muted-foreground" role="status">No events yet.</p>
      )}
      <ul className="flex flex-col gap-1" aria-live="polite">
        {events.map((ev) => {
            const colors = EVENT_TYPE_COLORS[ev.event_type] ?? DEFAULT_EVENT_COLOR;
            return (
              <li key={ev.id} className="flex items-center justify-between rounded border border-border px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                  >
                    {ev.event_type.replace("_", " ")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ev.date}{ev.time ? ` · ${ev.time}` : ""}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteEvent(ev.id)}
                  className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Delete event: ${ev.event_type.replace("_", " ")} on ${ev.date}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

export default CalendarEventsList;
