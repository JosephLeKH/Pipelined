/** Modal form for manually adding a job application without the browser extension. */

import { useCallback } from "react";

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
import { MANUAL_ADD_FORM_WIDTH_PX } from "../lib/constants";

function ManualAddForm({ isOpen, onClose, initialStage = "" }) {
  const hook = useManualAddForm({ isOpen, onClose, initialStage });
  const { handleClose, handleSubmit, isPending } = hook;

  const handleFormKeyDown = useCallback(
    (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent
        className="gap-0 p-0"
        style={{ maxWidth: `${MANUAL_ADD_FORM_WIDTH_PX}px` }}
      >
        <DialogHeader className="border-b border-border-1 px-6 py-4">
          <DialogTitle>Add application</DialogTitle>
        </DialogHeader>
        <form
          id="manual-add-form"
          onSubmit={handleSubmit}
          onKeyDown={handleFormKeyDown}
          noValidate
          className="flex flex-col gap-4 px-6 py-4"
        >
          <ManualAddFormFields hook={hook} />
        </form>
        <DialogFooter className="border-t border-border-1 px-6 py-4">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="manual-add-form"
            variant="default"
            size="sm"
            disabled={isPending}
            aria-busy={isPending}
            aria-keyshortcuts="Meta+Enter"
          >
            {isPending ? "Saving…" : "Add application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ManualAddForm;
