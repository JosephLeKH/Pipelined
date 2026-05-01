/** Modal form for creating a new calendar event linked to an application. */

import { useAppSelector } from "../hooks/useAppSelector";
import { useNewEventForm } from "../hooks/useNewEventForm";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { NewEventFormFields } from "./NewEventFormFields";

const LISTBOX_CLASSES = "w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function AppSelector({ apps, applicationId, onApplicationChange }) {
  const { appSearch, filteredApps, handleSearchChange, handleSelectChange } =
    useAppSelector({ applicationId, apps, onApplicationChange });
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="app-search">
        Application
      </label>
      <Input id="app-search" type="text" placeholder="Search by company or role…"
        value={appSearch} onChange={handleSearchChange} autoComplete="off" />
      <select value={applicationId} onChange={handleSelectChange} className={LISTBOX_CLASSES}
        aria-label="Select application" size={Math.min(filteredApps.length || 1, 5)}>
        {filteredApps.length === 0 && <option value="" disabled>No matching applications</option>}
        {filteredApps.map((a) => (
          <option key={a.id} value={a.id}>{a.company} — {a.role_title}</option>
        ))}
      </select>
    </div>
  );
}

function NewEventForm({ initialDate, initialApplicationId, onClose }) {
  const hook = useNewEventForm({ initialDate, initialApplicationId, onClose });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>New Event</DialogTitle>
        </DialogHeader>
        <form id="new-event-form" onSubmit={hook.handleSubmit} className="flex flex-col gap-4 px-6 py-4">
          <AppSelector apps={hook.apps} applicationId={hook.applicationId} onApplicationChange={hook.setApplicationId} />
          <NewEventFormFields eventType={hook.eventType} setEventType={hook.setEventType}
            date={hook.date} setDate={hook.setDate} time={hook.time} setTime={hook.setTime}
            notes={hook.notes} setNotes={hook.setNotes} formError={hook.formError} />
        </form>
        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="new-event-form" disabled={hook.isPending}>
            {hook.isPending ? "Saving…" : "Save Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default NewEventForm;
