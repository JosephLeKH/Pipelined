/** Single tag row — 40 px list item with color dot, count, and row menu. */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Check from "lucide-react/dist/esm/icons/check";
import Filter from "lucide-react/dist/esm/icons/filter";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import XIcon from "lucide-react/dist/esm/icons/x";

import TagDot from "./TagDot";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { TAG_COLOR_SWATCHES } from "../lib/constants";
import { getTagColor, saveTagColor } from "../lib/tagUtils";

function TagNameEditor({ name, onSave, onCancel }) {
  const [value, setValue] = useState(name);

  const handleSave = useCallback(() => {
    const trimmed = value.trim().toLowerCase();
    if (trimmed && trimmed !== name) onSave(trimmed);
    else onCancel();
  }, [value, name, onSave, onCancel]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") handleSave();
      if (e.key === "Escape") onCancel();
    },
    [handleSave, onCancel],
  );

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        className="h-7 max-w-xs text-[0.8125rem]"
      />
      <Button type="button" variant="ghost" onClick={handleSave} aria-label="Save" className="h-7 w-7 p-0">
        <Check className="h-4 w-4 text-brand-600" aria-hidden="true" />
      </Button>
      <Button type="button" variant="ghost" onClick={onCancel} aria-label="Cancel" className="h-7 w-7 p-0">
        <XIcon className="h-4 w-4 text-text-3" aria-hidden="true" />
      </Button>
    </div>
  );
}

function TagListRow({ tag, tagColor, onRename, onDelete, onColorChange }) {
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  const handleFilterDashboard = () => {
    navigate(`/dashboard?tags=${encodeURIComponent(tag.name)}`);
  };

  const handleColorPick = (color) => {
    saveTagColor(tag.name, color);
    onColorChange?.();
  };

  return (
    <div
      className="group flex h-10 items-center gap-3 border-b border-border-1 px-3 last:border-b-0 motion-safe:transition-colors motion-reduce:transition-none hover:bg-surface-1"
      data-testid="tag-list-row"
    >
      <TagDot color={tagColor} />

      {editing ? (
        <TagNameEditor
          name={tag.name}
          onSave={(newName) => {
            onRename(tag.name, newName);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-text-1">
            #{tag.name}
          </span>
          <span className="shrink-0 text-xs text-text-3 tabular-nums">
            {tag.count} {tag.count === 1 ? "application" : "applications"}
          </span>
        </>
      )}

      {!editing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Actions for tag ${tag.name}`}
              className="h-7 w-7 shrink-0 text-text-3 opacity-0 focus-visible:opacity-100 group-hover:opacity-100 motion-safe:transition-opacity motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-1 dark:focus-visible:outline-1"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[12rem]">
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit name
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Change color</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {TAG_COLOR_SWATCHES.map((color) => (
                  <DropdownMenuItem
                    key={color}
                    onSelect={() => handleColorPick(color)}
                    className="gap-2"
                  >
                    <TagDot color={color} />
                    {color === tagColor ? (
                      <Check className="ml-auto h-4 w-4 text-brand-600" aria-hidden="true" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={handleFilterDashboard}>
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filter dashboard by this tag
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onDelete(tag)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export { TagListRow };
