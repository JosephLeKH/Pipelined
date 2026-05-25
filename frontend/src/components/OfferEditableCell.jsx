import { useState, useCallback } from "react";

import { formatUSD } from "../lib/currencyUtils";

import { Button } from "./ui/button";
import { Input } from "./ui/input";

const SAVE_PULSE_MS = 600;

function fmtCell(fieldType, value) {
  if (value == null || value === "") return null;
  return fieldType === "currency" ? formatUSD(value) : String(value);
}

function SavePulseDot() {
  return (
    <span
      className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand-700 animate-pulse-dot motion-reduce:animate-none"
      aria-hidden="true"
      data-testid="offer-cell-save-pulse"
    />
  );
}

function EditableCellInput({ value, fieldType, handleBlur, validationError }) {
  return (
    <Input
      type="text"
      inputMode={fieldType === "currency" ? "numeric" : "text"}
      defaultValue={value ?? ""}
      autoFocus
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className="h-7 w-full min-w-[7rem] text-right text-sm focus-visible:ring-2 focus-visible:ring-brand-700 dark:focus-visible:ring-1"
      aria-label={`Edit ${fieldType}`}
      aria-invalid={!!validationError}
      aria-describedby={validationError ? `offer-cell-error-${fieldType}` : undefined}
    />
  );
}

function EditableCellDisplay({ value, fieldType, onEdit, saving }) {
  const display = fmtCell(fieldType, value);
  return (
    <span className="inline-flex items-center justify-end">
      <Button
        type="button"
        variant="ghost"
        onClick={onEdit}
        className="h-auto min-h-7 justify-end p-0 text-right text-sm font-medium text-text-1 hover:bg-transparent hover:underline focus-visible:ring-2 focus-visible:ring-brand-700 dark:focus-visible:ring-1"
      >
        {display ?? <span className="italic text-text-3">—</span>}
      </Button>
      {saving && <SavePulseDot />}
    </span>
  );
}

export function EditableCell({ appId, fieldKey, fieldType, value, offerDetails, onSave }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const finishSave = useCallback(() => {
    setSaving(true);
    window.setTimeout(() => setSaving(false), SAVE_PULSE_MS);
  }, []);

  const handleBlur = useCallback(
    (e) => {
      const raw = e.target.value;
      if (raw === "") {
        setValidationError(null);
        onSave(appId, fieldKey, null, offerDetails);
        setEditing(false);
        finishSave();
        return;
      }
      if (fieldType === "currency") {
        const numVal = Number(raw);
        if (!Number.isFinite(numVal) || numVal < 0) {
          setValidationError("Enter a valid non-negative number.");
          return;
        }
        onSave(appId, fieldKey, Math.round(numVal), offerDetails);
      } else {
        onSave(appId, fieldKey, raw, offerDetails);
      }
      setValidationError(null);
      setEditing(false);
      finishSave();
    },
    [appId, fieldKey, fieldType, offerDetails, onSave, finishSave]
  );

  return (
    <div>
      {editing
        ? <EditableCellInput value={value} fieldType={fieldType} handleBlur={handleBlur} validationError={validationError} />
        : <EditableCellDisplay value={value} fieldType={fieldType} onEdit={() => setEditing(true)} saving={saving} />}
      {validationError && (
        <p id={`offer-cell-error-${fieldType}`} role="alert" className="mt-1 text-xs text-destructive">{validationError}</p>
      )}
    </div>
  );
}
