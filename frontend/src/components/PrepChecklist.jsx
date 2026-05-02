/** Checklist sub-components for the interview prep section. */

import { useState, useCallback } from "react";

import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";

import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";

export function ChecklistItem({ item, onToggle, onDelete }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <Checkbox
        id={`checklist-item-${item.id}`}
        checked={item.checked}
        onCheckedChange={() => onToggle(item.id)}
        className="mt-0.5 flex-shrink-0"
        aria-label={item.text}
      />
      <label
        htmlFor={`checklist-item-${item.id}`}
        className={`flex-1 cursor-pointer text-sm ${item.checked ? "text-muted-foreground line-through" : "text-foreground"}`}
      >
        {item.text}
      </label>
      <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(item.id)}
        className="h-6 w-6 flex-shrink-0 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
        aria-label={`Delete checklist item: ${item.text}`}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
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
      <Plus className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <Input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add item and press Enter"
        aria-label="New checklist item"
        maxLength={200}
        className="flex-1"
      />
    </div>
  );
}
