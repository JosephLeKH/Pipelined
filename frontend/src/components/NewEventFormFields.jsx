/** Event type, date, time, notes fields and error message for NewEventForm. */

import { EVENT_TYPE_OPTIONS } from "../lib/constants";
import { INPUT_BASE } from "../lib/designTokens";

export function NewEventFormFields({ eventType, setEventType, date, setDate, time, setTime, notes, setNotes, formError }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase text-slate-400" htmlFor="event-type">
          Event Type
        </label>
        <select id="event-type" value={eventType} onChange={(e) => setEventType(e.target.value)} className={`${INPUT_BASE}`}>
          {EVENT_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase text-slate-400" htmlFor="event-date">Date</label>
        <input id="event-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${INPUT_BASE}`} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase text-slate-400" htmlFor="event-time">
          Time{" "}<span className="font-normal normal-case text-slate-400">(optional)</span>
        </label>
        <input id="event-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${INPUT_BASE}`} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase text-slate-400" htmlFor="event-notes">
          Notes{" "}<span className="font-normal normal-case text-slate-400">(optional)</span>
        </label>
        <textarea id="event-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={`min-h-[80px] resize-y ${INPUT_BASE}`} />
      </div>
      {formError && <p className="text-sm text-red-600">{formError}</p>}
    </>
  );
}
