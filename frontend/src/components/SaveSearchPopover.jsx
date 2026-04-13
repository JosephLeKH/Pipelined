/** Popover dialog to save current search with custom name. */

import { useState } from "react";
import { toast } from "sonner";
import { useCreateSavedSearch } from "../hooks/useSavedSearches";

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
      className="absolute right-0 top-10 z-30 w-64 rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800"
    >
      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Name this search</p>
      <input
        type="text"
        aria-label="Saved search name"
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, MAX_SAVE_NAME_LENGTH))}
        placeholder="e.g. SWE Intern Remote"
        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        autoFocus
      />
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || createMutation.isPending}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}
