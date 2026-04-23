/** Modal form for manually adding a job application without the browser extension. */

import X from "lucide-react/dist/esm/icons/x";

import { useManualAddForm } from "../hooks/useManualAddForm";
import { ManualAddFormFields } from "./ManualAddFormFields";
import { MODAL_BACKDROP, MODAL_CARD, BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_GHOST } from "../lib/designTokens";

function ManualAddForm({ isOpen, onClose }) {
  const hook = useManualAddForm({ isOpen, onClose });
  const { dialogRef, handleClose, handleDialogKeyDown, handleOverlayClick, handleSubmit } = hook;

  if (!isOpen) return null;

  return (
    <div
      className={MODAL_BACKDROP}
      data-testid="modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Add application"
    >
      <div
        ref={dialogRef}
        className={MODAL_CARD}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
      >
        <div className="flex items-center justify-between border-b border-border-default px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100">Add Application</h2>
          <button
            type="button"
            onClick={handleClose}
            className={`${BUTTON_GHOST} p-2`}
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 px-6 py-4">
          <ManualAddFormFields hook={hook} />
        </form>
        <div className="flex justify-end gap-2 border-t border-border-default px-6 py-4">
          <button type="button" onClick={handleClose} className={`${BUTTON_SECONDARY} text-sm`}>Cancel</button>
          <button type="submit" form="manual-add-form" className={`${BUTTON_PRIMARY} text-sm`}>Add Application</button>
        </div>
      </div>
    </div>
  );
}

export default ManualAddForm;
