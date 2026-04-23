/** Modal form for manually adding a job application without the browser extension. */

import X from "lucide-react/dist/esm/icons/x";

import { useManualAddForm } from "../hooks/useManualAddForm";
import { ManualAddFormFields } from "./ManualAddFormFields";

function ManualAddForm({ isOpen, onClose }) {
  const hook = useManualAddForm({ isOpen, onClose });
  const { overlayRef, dialogRef, handleClose, handleDialogKeyDown, handleOverlayClick, handleSubmit } = hook;

  return (
    <div
      ref={overlayRef}
      data-testid="modal-overlay"
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={handleOverlayClick}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none" aria-hidden="true" />
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-modal animate-scaleIn dark:bg-gray-800 dark:border dark:border-gray-700"
        role="dialog"
        aria-modal="true"
        aria-label="Add application"
        onKeyDown={handleDialogKeyDown}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Application</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-button p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 px-6 py-4">
          <ManualAddFormFields hook={hook} />
        </form>
      </div>
    </div>
  );
}

export default ManualAddForm;
