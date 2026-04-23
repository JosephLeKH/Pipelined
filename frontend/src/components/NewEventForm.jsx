/** Modal form for creating a new calendar event linked to an application. */

import X from "lucide-react/dist/esm/icons/x";

import { useAppSelector } from "../hooks/useAppSelector";
import { useNewEventForm } from "../hooks/useNewEventForm";
import { INPUT_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY, MODAL_CARD } from "../lib/designTokens";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={hook.handleOverlayClick}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none" aria-hidden="true" />
      <div className={`relative w-full max-w-md p-6 ${MODAL_CARD}`}
        role="dialog" aria-modal="true" aria-label="New calendar event">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New Event</h2>
          <button type="button" onClick={onClose}
            className="rounded-button p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close form">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={hook.handleSubmit} className="flex flex-col gap-4">
          <AppSelector apps={hook.apps} applicationId={hook.applicationId} onApplicationChange={hook.setApplicationId} />
          <NewEventFormFields eventType={hook.eventType} setEventType={hook.setEventType}
            date={hook.date} setDate={hook.setDate} time={hook.time} setTime={hook.setTime}
            notes={hook.notes} setNotes={hook.setNotes} formError={hook.formError} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className={`${BUTTON_SECONDARY} text-sm`}>Cancel</button>
            <button type="submit" disabled={hook.isPending} className={`${BUTTON_PRIMARY} text-sm`}>
              {hook.isPending ? "Saving…" : "Save Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewEventForm;
