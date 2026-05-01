/** Dialog for merging two duplicate applications with per-field conflict resolution. */

import { useState } from "react";

import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import AlertTriangle from "lucide-react/dist/esm/icons/triangle-alert";

import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const MERGE_FIELDS = [
  { key: "company", label: "Company" },
  { key: "role_title", label: "Role Title" },
  { key: "current_stage", label: "Stage" },
  { key: "location", label: "Location" },
  { key: "compensation", label: "Compensation" },
  { key: "notes", label: "Notes" },
  { key: "tags", label: "Tags" },
];

function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function displayValue(value) {
  if (isEmpty(value)) return <span className="italic text-muted-foreground">—</span>;
  if (Array.isArray(value)) return value.join(", ");
  return value;
}

function pickDefault(appA, appB, fieldKey) {
  const aVal = appA[fieldKey];
  const bVal = appB[fieldKey];
  if (!isEmpty(aVal) && isEmpty(bVal)) return "a";
  if (!isEmpty(bVal) && isEmpty(aVal)) return "b";
  if (appA.updated_at >= appB.updated_at) return "a";
  return "b";
}

function buildInitialSelections(appA, appB) {
  const result = {};
  for (const { key } of MERGE_FIELDS) {
    result[key] = pickDefault(appA, appB, key);
  }
  return result;
}

export default function MergeDialog({ apps, onConfirm, onCancel, isPending = false }) {
  const [appA, appB] = apps;
  const [selections, setSelections] = useState(() => buildInitialSelections(appA, appB));

  function handleChange(fieldKey, side) {
    setSelections((prev) => ({ ...prev, [fieldKey]: side }));
  }

  function handleConfirm() {
    const aCount = Object.values(selections).filter((v) => v === "a").length;
    const bCount = Object.values(selections).filter((v) => v === "b").length;
    const targetId = aCount >= bCount ? appA.id : appB.id;
    const sourceId = aCount >= bCount ? appB.id : appA.id;
    onConfirm({ source_id: sourceId, target_id: targetId });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Merge duplicate applications</DialogTitle>
        </DialogHeader>

        <div className="mx-6 mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Merging will combine these applications into one. The duplicate will be permanently deleted. This cannot be undone.
          </p>
        </div>

        <div className="grid grid-cols-[120px_1fr_1fr] gap-2 border-b border-border bg-muted px-6 py-2 text-xs font-medium text-muted-foreground">
          <div>Field</div>
          <div className="truncate">{appA.company || appA.role_title || "App A"}</div>
          <div className="truncate">{appB.company || appB.role_title || "App B"}</div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {MERGE_FIELDS.map(({ key, label }) => (
            <div key={key} className="grid grid-cols-[120px_1fr_1fr] gap-2 border-b border-border px-6 py-2 text-sm">
              <span className="font-medium text-muted-foreground">{label}</span>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name={key}
                  value="a"
                  checked={selections[key] === "a"}
                  onChange={() => handleChange(key, "a")}
                  className="mt-0.5 shrink-0 accent-primary"
                />
                <span className="text-foreground">{displayValue(appA[key])}</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name={key}
                  value="b"
                  checked={selections[key] === "b"}
                  onChange={() => handleChange(key, "b")}
                  className="mt-0.5 shrink-0 accent-primary"
                />
                <span className="text-foreground">{displayValue(appB[key])}</span>
              </label>
            </div>
          ))}
        </div>

        <div className="border-t border-border bg-muted px-6 py-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground">
            {MERGE_FIELDS.map(({ key, label }) => {
              const val = selections[key] === "a" ? appA[key] : appB[key];
              return (
                <span key={key}>
                  <span className="font-medium">{label}:</span>{" "}
                  {isEmpty(val) ? <span className="italic text-muted-foreground">—</span> : displayValue(val)}
                </span>
              );
            })}
          </div>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} autoFocus>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isPending} className="flex items-center gap-1.5">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
