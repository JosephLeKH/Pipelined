/** Checklist sub-components for the interview prep section. */

import { useState, useCallback } from "react";

import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { INPUT_BASE } from "../lib/designTokens";

export function ChecklistItem({ item, onToggle, onDelete }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <input
        type="checkbox"
        id={`checklist-item-${item.id}`}
        checked={item.checked}
        onChange={() => onToggle(item.id)}
        className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        aria-label={item.text}
      />
      <label
        htmlFor={`checklist-item-${item.id}`}
        className={`flex-1 cursor-pointer text-sm ${item.checked ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-300"}`}
      >
        {item.text}
      </label>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="flex-shrink-0 rounded p-0.5 text-gray-300 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-400"
        aria-label={`Delete checklist item: ${item.text}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function AddChecklistItem({ onAdd }) {
  const [text, setText] = useState("");

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = text.trim();
      if (trimmed) {
        onAdd(trimmed);
        setText("");
      }
    }
  }, [text, onAdd]);

  return (
    <div className="flex items-center gap-2 pt-1">
      <Plus className="h-4 w-4 flex-shrink-0 text-gray-400" />
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add item and press Enter"
        className="flex-1 border border-gray-200 bg-white rounded-input px-2 py-1 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        aria-label="New checklist item"
        maxLength={200}
      />
    </div>
  );
}
