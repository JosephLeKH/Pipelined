/** Popover dialog to save current search with custom name. */

import { useState } from "react";
import { toast } from "sonner";
import { useCreateSavedSearch } from "../hooks/useSavedSearches";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

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
      className="rounded-xl bg-card border border-border absolute right-0 top-10 z-30 w-64 p-4 shadow-lg"
    >
      <p className="mb-2 text-sm font-medium text-foreground">Name this search</p>
      <Input
        type="text"
        aria-label="Saved search name"
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, MAX_SAVE_NAME_LENGTH))}
        placeholder="e.g. SWE Intern Remote"
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        autoFocus
      />
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={!name.trim() || createMutation.isPending}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
