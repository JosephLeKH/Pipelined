/** Collapsible offer details section for Offer-stage applications in DetailPanel. */

import { useState, useCallback } from "react";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";

import { OFFER_FIELDS } from "../lib/constants";
import { formatUSD } from "../lib/currencyUtils";
import { Button } from "./ui/button";

const INPUT_CLS = "border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/20 focus:outline-none transition-colors text-sm px-3 py-2 font-sans w-full";

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
      <span className="text-xs font-medium uppercase text-muted-foreground">
        {fieldMeta.label}
      </span>
      {editing ? (
        <input
          type={fieldMeta.type === "currency" ? "number" : "text"}
          defaultValue={value ?? ""}
          autoFocus
          onBlur={handleBlur}
          className={INPUT_CLS}
          aria-label={fieldMeta.label}
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={() => setEditing(true)}
          className="h-auto p-0 text-left text-sm text-foreground hover:bg-transparent hover:underline justify-start"
          aria-label={`Edit ${fieldMeta.label}`}
        >
          {formatFieldDisplay(fieldMeta, value) ?? (
            <span className="italic text-muted-foreground">Click to set</span>
          )}
        </Button>
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
    <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/10 p-3">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        className="h-auto p-0 gap-1.5 text-sm font-semibold text-primary hover:bg-transparent hover:text-primary"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        Offer Details
      </Button>
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
