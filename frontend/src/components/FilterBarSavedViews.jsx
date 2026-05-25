/** Saved views dropdown for FilterBar — apply, delete, and save current filters. */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import {
  useCreateSavedSearch,
  useDeleteSavedSearch,
  useSavedSearches,
} from "../hooks/useSavedSearches";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { FilterDropdownTrigger, SingleSelectFilterDropdown } from "./FilterBarDropdown";

const MAX_SAVE_NAME_LENGTH = 100;

export function buildDashboardSavedSearchParams(savedSearch) {
  const next = new URLSearchParams();
  if (savedSearch.query) next.set("q", savedSearch.query);
  const f = savedSearch.filters ?? {};
  const appendAll = (key, val) => {
    if (!val) return;
    (Array.isArray(val) ? val : [val]).forEach((v) => next.append(key, v));
  };
  appendAll("stage", f.stage);
  appendAll("company_type", f.company_type);
  appendAll("remote_status", f.remote_status);
  appendAll("tags", f.tags);
  if (f.date_from) next.set("date_from", f.date_from);
  if (f.date_to) next.set("date_to", f.date_to);
  if (f.include_archived) next.set("include_archived", "true");
  return next;
}

function SaveViewForm({ currentFilters, onClose }) {
  const [name, setName] = useState("");
  const createMutation = useCreateSavedSearch();

  function handleSave() {
    if (!name.trim()) return;
    const { page: _p, per_page: _pp, q, ...filterFields } = currentFilters;
    createMutation.mutate(
      { name: name.trim(), query: q ?? "", filters: filterFields },
      {
        onSuccess: () => {
          toast.success(`Saved view "${name.trim()}"`);
          onClose();
        },
        onError: (err) => {
          const msg = err?.response?.data?.detail ?? "Failed to save view.";
          toast.error(msg);
        },
      }
    );
  }

  return (
    <div className="space-y-2 p-2" role="dialog" aria-label="Save current view">
      <Input
        type="text"
        aria-label="Saved view name"
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, MAX_SAVE_NAME_LENGTH))}
        placeholder="e.g. SWE Intern Remote"
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        autoFocus
      />
      <div className="flex justify-end gap-1.5">
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

export function SavedViewsDropdown({ currentFilters, hasActiveFilters }) {
  const [, setSearchParams] = useSearchParams();
  const { data: searches = [] } = useSavedSearches();
  const deleteMutation = useDeleteSavedSearch();
  const [saving, setSaving] = useState(false);

  function handleApply(search) {
    setSearchParams(buildDashboardSavedSearchParams(search), { replace: true });
  }

  function handleDelete(e, id) {
    e.stopPropagation();
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Saved view deleted"),
    });
  }

  const displayValue = searches.length ? `${searches.length} saved` : "None";

  return (
    <SingleSelectFilterDropdown
      label="Saved view"
      displayValue={displayValue}
      ariaLabel="Saved views"
      contentClassName="w-64"
    >
      {searches.length > 0 && (
        <>
          <DropdownMenuLabel>Saved views</DropdownMenuLabel>
          {searches.map((s) => (
            <DropdownMenuItem
              key={s.id}
              className="flex items-center justify-between gap-2"
              onSelect={() => handleApply(s)}
            >
              <span className="truncate">{s.name}</span>
              <div className="flex shrink-0 items-center gap-1">
                {s.new_matches_count > 0 && (
                  <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                    {s.new_matches_count}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete saved view: ${s.name}`}
                  className="h-6 w-6 text-text-3 hover:text-destructive"
                  onClick={(e) => handleDelete(e, s.id)}
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                </Button>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
        </>
      )}
      {saving ? (
        <SaveViewForm currentFilters={currentFilters} onClose={() => setSaving(false)} />
      ) : (
        <DropdownMenuItem
          disabled={!hasActiveFilters}
          onSelect={(e) => {
            e.preventDefault();
            if (hasActiveFilters) setSaving(true);
          }}
        >
          Save current as view…
        </DropdownMenuItem>
      )}
    </SingleSelectFilterDropdown>
  );
}
