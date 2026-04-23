/** Dialog for merging two duplicate applications with per-field conflict resolution. */

import { useState, useEffect, useRef } from "react";

import X from "lucide-react/dist/esm/icons/x";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { BUTTON_PRIMARY, BUTTON_SECONDARY, MODAL_CARD } from "../lib/designTokens";

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
  if (isEmpty(value)) return <span className="italic text-gray-400">—</span>;
  if (Array.isArray(value)) return value.join(", ");
  return value;
}

function pickDefault(appA, appB, fieldKey) {
  const aVal = appA[fieldKey];
  const bVal = appB[fieldKey];
  if (!isEmpty(aVal) && isEmpty(bVal)) return "a";
  if (!isEmpty(bVal) && isEmpty(aVal)) return "b";
  // Both non-empty: prefer more recently updated
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

/**
 * MergeDialog — side-by-side merge UI for exactly 2 selected applications.
 *
 * Props:
 *   apps: [appA, appB]  — the two Application objects
 *   onConfirm({ source_id, target_id }) — called with merge payload
 *   onCancel() — called when user cancels
 *   isPending — shows loading state on confirm button
 */
export default function MergeDialog({ apps, onConfirm, onCancel, isPending = false }) {
  const [appA, appB] = apps;
  const [selections, setSelections] = useState(() => buildInitialSelections(appA, appB));
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(e) { if (e.key === "Escape") onCancel(); }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  function handleChange(fieldKey, side) {
    setSelections((prev) => ({ ...prev, [fieldKey]: side }));
  }

  function handleConfirm() {
    // Count how many fields come from each app
    const aCount = Object.values(selections).filter((v) => v === "a").length;
    const bCount = Object.values(selections).filter((v) => v === "b").length;
    // target = the app whose fields are mostly KEPT; source = the app being merged in
    const targetId = aCount >= bCount ? appA.id : appB.id;
    const sourceId = aCount >= bCount ? appB.id : appA.id;
    onConfirm({ source_id: sourceId, target_id: targetId });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-dialog-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className={`flex w-full max-w-2xl flex-col ${MODAL_CARD}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 id="merge-dialog-heading" className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Merge duplicate applications
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onCancel}
            className="rounded-button p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[120px_1fr_1fr] gap-2 border-b border-gray-100 bg-gray-50 px-6 py-2 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          <div>Field</div>
          <div className="truncate">{appA.company || appA.role_title || "App A"}</div>
          <div className="truncate">{appB.company || appB.role_title || "App B"}</div>
        </div>

        {/* Field rows */}
        <div className="max-h-80 overflow-y-auto">
          {MERGE_FIELDS.map(({ key, label }) => (
            <div
              key={key}
              className="grid grid-cols-[120px_1fr_1fr] gap-2 border-b border-gray-100 px-6 py-2 text-sm dark:border-gray-700"
            >
              <span className="font-medium text-gray-600 dark:text-gray-400">{label}</span>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name={key}
                  value="a"
                  checked={selections[key] === "a"}
                  onChange={() => handleChange(key, "a")}
                  className="mt-0.5 shrink-0 accent-brand-500"
                />
                <span className="text-gray-800 dark:text-gray-200">{displayValue(appA[key])}</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name={key}
                  value="b"
                  checked={selections[key] === "b"}
                  onChange={() => handleChange(key, "b")}
                  className="mt-0.5 shrink-0 accent-brand-500"
                />
                <span className="text-gray-800 dark:text-gray-200">{displayValue(appB[key])}</span>
              </label>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Preview
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 dark:text-gray-300">
            {MERGE_FIELDS.map(({ key, label }) => {
              const val = selections[key] === "a" ? appA[key] : appB[key];
              return (
                <span key={key}>
                  <span className="font-medium">{label}:</span>{" "}
                  {isEmpty(val) ? <span className="italic text-gray-400">—</span> : displayValue(val)}
                </span>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className={`${BUTTON_SECONDARY} text-sm`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className={`${BUTTON_PRIMARY} text-sm flex items-center gap-1.5`}
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Merge
          </button>
        </div>
      </div>
    </div>
  );
}
