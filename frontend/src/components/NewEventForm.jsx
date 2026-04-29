/** Modal form for creating a new calendar event linked to an application. */

import X from "lucide-react/dist/esm/icons/x";

import { useAppSelector } from "../hooks/useAppSelector";
import { useNewEventForm } from "../hooks/useNewEventForm";
import { INPUT_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_GHOST, MODAL_CARD, MODAL_BACKDROP } from "../lib/designTokens";
import { NewEventFormFields } from "./NewEventFormFields";

function AppSelector({ apps, applicationId, onApplicationChange }) {
  const { appSearch, filteredApps, handleSearchChange, handleSelectChange } =
    useAppSelector({ applicationId, apps, onApplicationChange });
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase text-gray-400" htmlFor="app-search">
        Application
      </label>
      <input id="app-search" type="text" placeholder="Search by company or role…"
        value={appSearch} onChange={handleSearchChange} className={`${INPUT_BASE}`} autoComplete="off" />
      <select value={applicationId} onChange={handleSelectChange} className={`${INPUT_BASE}`}
        aria-label="Select application" size={Math.min(filteredApps.length || 1, 5)}>
        {filteredApps.length === 0 && <option value="" disabled>No matching applications</option>}
        {filteredApps.map((a) => (
          <option key={a.id} value={a.id}>{a.company} — {a.role_title}</option>
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
  const hook = useNewEventForm({ initialDate, initialApplicationId, onClose });
  return (
    <div className={`${MODAL_BACKDROP} cursor-pointer`}
      onClick={hook.handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="New calendar event"
    >
      <div className={MODAL_CARD}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-default px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100">New Event</h2>
          <button type="button" onClick={onClose} className={`${BUTTON_GHOST} p-2`} aria-label="Close form">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form id="new-event-form" onSubmit={hook.handleSubmit} className="flex flex-col gap-4 px-6 py-4">
          <AppSelector apps={hook.apps} applicationId={hook.applicationId} onApplicationChange={hook.setApplicationId} />
          <NewEventFormFields eventType={hook.eventType} setEventType={hook.setEventType}
            date={hook.date} setDate={hook.setDate} time={hook.time} setTime={hook.setTime}
            notes={hook.notes} setNotes={hook.setNotes} formError={hook.formError} />
        </form>
        <div className="flex justify-end gap-2 border-t border-border-default px-6 py-4">
          <button type="button" onClick={onClose} className={`${BUTTON_SECONDARY} text-sm`}>Cancel</button>
          <button type="submit" form="new-event-form" disabled={hook.isPending} className={`${BUTTON_PRIMARY} text-sm`}>
            {hook.isPending ? "Saving…" : "Save Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewEventForm;
