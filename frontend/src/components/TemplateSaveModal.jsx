/** Modal for naming and saving the current form values as a template. */

import { useEffect, useRef, useState } from "react";

import X from "lucide-react/dist/esm/icons/x";

import { INPUT_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY } from "../lib/designTokens";
import { useCreateTemplate } from "../hooks/useTemplates";

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
      setTimeout(() => inputRef.current?.focus(), 50);
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-template-heading"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-modal dark:bg-slate-800 dark:border dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="save-template-heading"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            Save as template
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-button p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <label
          htmlFor="template-name-input"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
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
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Saves: remote status, company type, role type, tags, and compensation.
        </p>
        <div className="mt-4 flex justify-end gap-2">
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
