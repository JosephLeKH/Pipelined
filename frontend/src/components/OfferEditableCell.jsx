import { useState, useCallback } from "react";

import { INPUT_BASE } from "../lib/designTokens";
import { formatUSD } from "../lib/currencyUtils";

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
      className={`w-full ${INPUT_BASE}`}
      aria-label={`Edit ${fieldType}`}
    />
  );
}

function EditableCellDisplay({ value, fieldType, onEdit }) {
  const display = fmtCell(fieldType, value);
  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full text-left text-sm text-gray-700 hover:underline dark:text-gray-300"
    >
      {display ?? <span className="italic text-gray-400">—</span>}
    </button>
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
        <p role="alert" className="mt-1 text-xs text-rose-600">{validationError}</p>
      )}
    </div>
  );
}
