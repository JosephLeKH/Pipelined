/** Event type, date, time, notes fields and error message for NewEventForm. */

import { EVENT_TYPE_OPTIONS } from "../lib/constants";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

export function NewEventFormFields({ eventType, setEventType, date, setDate, time, setTime, notes, setNotes, formError }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="event-type">
          Event Type
        </label>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger id="event-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="event-date">Date</label>
        <Input id="event-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required aria-describedby={formError ? 'event-form-error' : undefined} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="event-time">
          Time{" "}<span className="font-normal normal-case text-muted-foreground">(optional)</span>
        </label>
        <Input id="event-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="event-notes">
          Notes{" "}<span className="font-normal normal-case text-muted-foreground">(optional)</span>
        </label>
        <Textarea id="event-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {formError && <p id="event-form-error" role="alert" className="text-sm text-destructive">{formError}</p>}
    </>
  );
}
