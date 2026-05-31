/** Event type, date, time, notes fields and error message for NewEventForm (PRD-06 §7.4). */

import { useMemo } from "react";

import { EVENT_TYPE_OPTIONS } from "../lib/constants";
import { toISODate } from "../lib/dateUtils";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

const FIELD_LABEL = "text-xs font-medium uppercase tracking-wide text-text-3";

export function NewEventFormFields({
  eventType,
  setEventType,
  date,
  setDate,
  time,
  setTime,
  notes,
  setNotes,
  formError,
}) {
  const minDate = useMemo(() => toISODate(new Date()), []);
  const isPastDate = date && date < minDate;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className={FIELD_LABEL} htmlFor="event-type">
          Type
        </label>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger id="event-type" aria-label="Event type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={FIELD_LABEL} htmlFor="event-date">
            Date
          </label>
          <Input
            id="event-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            min={minDate}
            required
            aria-describedby={isPastDate || formError ? "event-form-error" : undefined}
          />
          {isPastDate && (
            <p id="event-form-error" role="alert" className="text-sm text-brand-700 dark:text-brand-400">
              Date cannot be in the past
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={FIELD_LABEL} htmlFor="event-time">
            Time
          </label>
          <Input
            id="event-time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={FIELD_LABEL} htmlFor="event-notes">
          Notes
        </label>
        <Textarea id="event-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
      </div>
      {formError && (
        <p id="event-form-error" role="alert" className="text-sm text-brand-700 dark:text-brand-400">
          {formError}
        </p>
      )}
    </>
  );
}
