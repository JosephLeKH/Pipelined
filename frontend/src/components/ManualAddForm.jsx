/** Modal form for manually adding a job application without the browser extension. */

import { useManualAddForm } from "../hooks/useManualAddForm";
import { ManualAddFormFields } from "./ManualAddFormFields";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

function ManualAddForm({ isOpen, onClose }) {
  const hook = useManualAddForm({ isOpen, onClose });
  const { handleClose, handleSubmit, isPending } = hook;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Add Application</DialogTitle>
        </DialogHeader>
        <form id="manual-add-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 px-6 py-4">
          <ManualAddFormFields hook={hook} />
        </form>
        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="submit" form="manual-add-form" disabled={isPending}>
            {isPending ? "Saving…" : "Add Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ManualAddForm;
