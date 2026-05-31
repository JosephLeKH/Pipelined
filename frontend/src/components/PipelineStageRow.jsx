/** Single sortable pipeline stage row — dot, name, color picker, remove, drag handle. */

import GripVertical from "lucide-react/dist/esm/icons/grip-vertical";
import X from "lucide-react/dist/esm/icons/x";

import { STAGE_COLOR_PICKER_OPTIONS } from "../lib/constants";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

const DRAG_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 dark:focus-visible:outline-1";

function StageColorPicker({ value, onChange, stageName }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={`Color for ${stageName}`}
        className="h-8 w-[5.5rem] gap-1.5 px-2 text-xs text-text-2"
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: STAGE_COLOR_PICKER_OPTIONS.find((o) => o.key === value)?.hex }}
          aria-hidden="true"
        />
        <SelectValue placeholder="Color" />
      </SelectTrigger>
      <SelectContent>
        {STAGE_COLOR_PICKER_OPTIONS.map((option) => (
          <SelectItem key={option.key} value={option.key}>
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: option.hex }}
                aria-hidden="true"
              />
              {option.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PipelineStageRow({
  id,
  name,
  dotColor,
  colorKey,
  onRename,
  onColorChange,
  onRemoveClick,
  canRemove,
  disabledTooltip,
  dragAttributes,
  dragListeners,
  setNodeRef,
  transformStyle,
  transitionStyle,
  isDragging,
}) {
  return (
    <div
      ref={setNodeRef}
      style={{ transform: transformStyle, transition: transitionStyle }}
      className={`flex h-[var(--row-height)] items-center gap-2 rounded-lg border border-border-1 bg-surface-0 px-3 motion-reduce:transition-none ${
        isDragging ? "opacity-60 shadow-sm" : "opacity-100"
      }`}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-hidden="true"
      />
      <Input
        type="text"
        value={name}
        maxLength={40}
        onChange={(e) => onRename(id, e.target.value)}
        className="h-8 flex-1 border-0 bg-transparent px-0 text-sm text-text-1 shadow-none focus-visible:ring-0"
        aria-label={`Stage name: ${name}`}
      />
      <StageColorPicker value={colorKey} onChange={(key) => onColorChange(id, key)} stageName={name} />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemoveClick(id)}
            disabled={!canRemove}
            aria-label={canRemove ? `Remove stage ${name}` : `Cannot remove stage ${name}`}
            className="h-7 w-7 shrink-0 text-text-3 hover:text-brand-700 disabled:opacity-30 dark:hover:text-brand-300"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        {disabledTooltip && <TooltipContent>{disabledTooltip}</TooltipContent>}
      </Tooltip>
      <button
        type="button"
        {...dragAttributes}
        {...dragListeners}
        aria-label={`Drag to reorder ${name}`}
        className={`ml-0.5 shrink-0 cursor-grab text-text-3 hover:text-text-1 active:cursor-grabbing ${DRAG_FOCUS}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

export default PipelineStageRow;
