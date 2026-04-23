/** Collapsible offer details section for Offer-stage applications in DetailPanel. */

import { useState, useCallback } from "react";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";

import { INPUT_BASE } from "../lib/designTokens";
import { OFFER_FIELDS } from "../lib/constants";
import { formatUSD } from "../lib/currencyUtils";

function formatFieldDisplay(fieldMeta, value) {
  if (value == null) return null;
  return fieldMeta.type === "currency" ? formatUSD(value) : value;
}

function OfferField({ fieldMeta, value, onChange }) {
  const [editing, setEditing] = useState(false);

  const handleBlur = useCallback(
    (e) => {
      if (fieldMeta.type === "currency") {
        const rawNum = parseInt(e.target.value, 10);
        onChange(e.target.value === "" || isNaN(rawNum) ? null : rawNum);
      } else {
        onChange(e.target.value || null);
      }
      setEditing(false);
    },
    [fieldMeta.type, onChange]
  );

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500">
        {fieldMeta.label}
      </span>
      {editing ? (
        <input
          type={fieldMeta.type === "currency" ? "number" : "text"}
          defaultValue={value ?? ""}
          autoFocus
          onBlur={handleBlur}
          className={INPUT_BASE}
          aria-label={fieldMeta.label}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-left text-sm text-slate-800 hover:underline dark:text-slate-200"
          aria-label={`Edit ${fieldMeta.label}`}
        >
          {formatFieldDisplay(fieldMeta, value) ?? (
            <span className="italic text-slate-400">Click to set</span>
          )}
        </button>
      )}
    </div>
  );
}

function OfferDetailsSection({ application, onUpdate }) {
  const [open, setOpen] = useState(true);
  const offerDetails = application.offer_details ?? {};

  const handleFieldChange = useCallback(
    (key, value) => {
      onUpdate({ offer_details: { ...offerDetails, [key]: value } });
    },
    [offerDetails, onUpdate]
  );

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        Offer Details
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          {OFFER_FIELDS.map((field) => (
            <OfferField
              key={field.key}
              fieldMeta={field}
              value={offerDetails[field.key] ?? null}
              onChange={(val) => handleFieldChange(field.key, val)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default OfferDetailsSection;
