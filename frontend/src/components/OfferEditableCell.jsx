import { useState, useCallback } from "react";

import { formatUSD } from "../lib/currencyUtils";

import { Button } from "./ui/button";

const INPUT_CLS = "w-full border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/20 focus:outline-none transition-colors text-sm px-3 py-2 font-sans";

function fmtCell(fieldType, value) {
  if (value == null || value === "") return null;
  return fieldType === "currency" ? formatUSD(value) : String(value);
}

function EditableCellInput({ value, fieldType, handleBlur }) {
  return (
    <input
      type="text"
      inputMode={fieldType === "currency" ? "numeric" : "text"}
      defaultValue={value ?? ""}
      autoFocus
      onBlur={handleBlur}
      className={INPUT_CLS}
      aria-label={`Edit ${fieldType}`}
    />
  );
}

function EditableCellDisplay({ value, fieldType, onEdit }) {
  const display = fmtCell(fieldType, value);
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onEdit}
      className="h-auto w-full justify-start p-0 text-left text-sm text-foreground hover:bg-transparent hover:underline"
    >
      {display ?? <span className="italic text-muted-foreground">—</span>}
    </Button>
  );
}

export function EditableCell({ appId, fieldKey, fieldType, value, offerDetails, onSave }) {
  const [editing, setEditing] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const handleBlur = useCallback(
    (e) => {
      const raw = e.target.value;
      if (raw === "") {
        setValidationError(null);
        onSave(appId, fieldKey, null, offerDetails);
        setEditing(false);
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
    },
    [appId, fieldKey, fieldType, offerDetails, onSave]
  );

  return (
    <div>
      {editing
        ? <EditableCellInput value={value} fieldType={fieldType} handleBlur={handleBlur} />
        : <EditableCellDisplay value={value} fieldType={fieldType} onEdit={() => setEditing(true)} />}
      {validationError && (
        <p role="alert" className="mt-1 text-xs text-destructive">{validationError}</p>
      )}
    </div>
  );
}
