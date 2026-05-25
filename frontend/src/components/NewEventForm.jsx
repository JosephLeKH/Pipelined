/** Modal form for creating a new calendar event linked to an application (PRD-06 §7.4). */

import { useAppSelector } from "../hooks/useAppSelector";
import { useNewEventForm } from "../hooks/useNewEventForm";
import { CALENDAR_EVENT_MODAL_WIDTH_PX } from "../lib/constants";
import { BUTTON_PRIMARY } from "../lib/designTokens";
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

const FIELD_LABEL = "text-xs font-medium uppercase tracking-wide text-text-3";

function AppSelector({ apps, applicationId, onApplicationChange }) {
  const { appSearch, filteredApps, handleSearchChange, handleSelectValueChange } =
    useAppSelector({ applicationId, apps, onApplicationChange });

  return (
    <div className="flex flex-col gap-1.5">
      <label className={FIELD_LABEL} htmlFor="app-search">
        Application
      </label>
      <Input
        id="app-search"
        type="text"
        placeholder="Search by company or role…"
        value={appSearch}
        onChange={handleSearchChange}
        autoComplete="off"
      />
      <Select value={applicationId || undefined} onValueChange={handleSelectValueChange}>
        <SelectTrigger aria-label="Select application">
          <SelectValue placeholder="Select an application" />
        </SelectTrigger>
        <SelectContent>
          {filteredApps.length === 0 ? (
            <SelectItem value="" disabled>
              No matching applications
            </SelectItem>
          ) : (
            filteredApps.map((app) => (
              <SelectItem key={app.id} value={app.id}>
                {app.company} · {app.role_title}
              </SelectItem>
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
      <DialogContent
        data-testid="new-event-form"
        className="gap-0 p-0"
        style={{ maxWidth: `${CALENDAR_EVENT_MODAL_WIDTH_PX}px` }}
        aria-labelledby="new-event-dialog-title"
      >
        <DialogHeader className="border-b border-border-1 px-6 py-4">
          <DialogTitle id="new-event-dialog-title" className="text-base font-semibold text-text-1">
            Add interview / event
          </DialogTitle>
        </DialogHeader>
        <form id="new-event-form" onSubmit={hook.handleSubmit} className="flex flex-col gap-4 px-6 py-4">
          <AppSelector
            apps={hook.apps}
            applicationId={hook.applicationId}
            onApplicationChange={hook.setApplicationId}
          />
          <NewEventFormFields
            eventType={hook.eventType}
            setEventType={hook.setEventType}
            date={hook.date}
            setDate={hook.setDate}
            time={hook.time}
            setTime={hook.setTime}
            notes={hook.notes}
            setNotes={hook.setNotes}
            formError={hook.formError}
          />
        </form>
        <DialogFooter className="border-t border-border-1 px-6 py-4">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-event-form"
            size="sm"
            disabled={hook.isPending}
            className={`${BUTTON_PRIMARY} dark:focus-visible:outline-1`}
          >
            {hook.isPending ? "Adding…" : "Add event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default NewEventForm;
