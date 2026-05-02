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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { NewEventFormFields } from "./NewEventFormFields";

function AppSelector({ apps, applicationId, onApplicationChange }) {
  const { appSearch, filteredApps, handleSearchChange, handleSelectValueChange } =
    useAppSelector({ applicationId, apps, onApplicationChange });
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="app-search">
        Application
      </label>
      <Input id="app-search" type="text" placeholder="Search by company or role…"
        value={appSearch} onChange={handleSearchChange} autoComplete="off" />
      <Select value={applicationId || undefined} onValueChange={handleSelectValueChange}>
        <SelectTrigger aria-label="Select application">
          <SelectValue placeholder="Select an application" />
        </SelectTrigger>
        <SelectContent>
          {filteredApps.length === 0 ? (
            <SelectItem value="" disabled>No matching applications</SelectItem>
          ) : (
            filteredApps.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.company} — {a.role_title}</SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
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
