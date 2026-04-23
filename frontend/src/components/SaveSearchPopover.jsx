/** Popover dialog to save current search with custom name. */

import { useState } from "react";
import { toast } from "sonner";
import { useCreateSavedSearch } from "../hooks/useSavedSearches";
import { BUTTON_PRIMARY, BUTTON_GHOST, INPUT_BASE, CARD_BASE } from "../lib/designTokens";

const MAX_SAVE_NAME_LENGTH = 100;

export default function SaveSearchPopover({ currentFilters, onClose }) {
  const [name, setName] = useState("");
  const createMutation = useCreateSavedSearch();

  function handleSave() {
    if (!name.trim()) return;
    const { page: _p, per_page: _pp, q, ...filterFields } = currentFilters;
    createMutation.mutate(
      { name: name.trim(), query: q ?? "", filters: filterFields },
      {
        onSuccess: () => {
          toast.success(`Saved search "${name.trim()}"`);
          onClose();
        },
        onError: (err) => {
          const msg = err?.response?.data?.detail ?? "Failed to save search.";
          toast.error(msg);
        },
      }
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Save this search"
      className={`absolute right-0 top-10 z-30 w-64 ${CARD_BASE} p-4 shadow-card`}
    >
      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Name this search</p>
      <input
        type="text"
        aria-label="Saved search name"
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, MAX_SAVE_NAME_LENGTH))}
        placeholder="e.g. SWE Intern Remote"
        className={INPUT_BASE}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        autoFocus
      />
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="text-gray-600 hover:bg-gray-100 rounded-button active:scale-[0.98] transition-all duration-150 font-medium text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || createMutation.isPending}
          className="bg-brand-500 text-white rounded-button shadow-sm hover:bg-brand-600 active:scale-[0.98] transition-all duration-150 font-medium text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
        >
          Save
        </button>
      </div>
    </div>
  );
}
