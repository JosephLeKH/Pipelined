/** Modal for naming and saving the current form values as a template. */

import { useEffect, useRef, useState } from "react";

import X from "lucide-react/dist/esm/icons/x";

import { INPUT_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_GHOST, MODAL_BACKDROP, MODAL_CARD } from "../lib/designTokens";
import { useCreateTemplate } from "../hooks/useTemplates";
import { MODAL_FOCUS_DELAY_MS } from "../lib/constants";

const MAX_TEMPLATE_NAME_LENGTH = 100;

function TemplateSaveModal({ isOpen, onClose, fields }) {
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const { mutate, isPending } = useCreateTemplate();

  useEffect(() => {
    if (isOpen) {
      setName("");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), MODAL_FOCUS_DELAY_MS);
    }
  }, [isOpen]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Template name is required.");
      return;
    }
    mutate(
      { name: trimmed, fields },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err) => {
          setError(err?.message ?? "Failed to save template.");
        },
      }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter") handleSave();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`${MODAL_BACKDROP} z-[60]`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-template-heading"
    >
      <div className={`${MODAL_CARD} max-w-sm p-6`}>
        <div className="flex items-center justify-between border-b border-border-default pb-4 mb-4">
          <h2
            id="save-template-heading"
            className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            Save as template
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className={`${BUTTON_GHOST} p-2`}
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <label
          htmlFor="template-name-input"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Template name
        </label>
        <input
          id="template-name-input"
          ref={inputRef}
          type="text"
          value={name}
          maxLength={MAX_TEMPLATE_NAME_LENGTH}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className={INPUT_BASE}
          placeholder="e.g. Remote SWE"
        />
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Saves: remote status, company type, role type, tags, and compensation.
        </p>
        <div className="mt-4 flex justify-end gap-2 border-t border-border-default pt-4">
          <button type="button" onClick={onClose} className={`${BUTTON_SECONDARY} text-sm px-3 py-2`}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className={`${BUTTON_PRIMARY} text-sm px-3 py-2`}
          >
            {isPending ? "Saving…" : "Save template"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TemplateSaveModal;
