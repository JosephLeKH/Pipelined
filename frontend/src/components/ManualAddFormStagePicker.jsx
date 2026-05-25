/** Segmented stage picker — first N stages visible, "More" expands the rest. */

import { useState } from "react";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";

import { MANUAL_ADD_VISIBLE_STAGES, STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { cn } from "../lib/utils";

function stageDotColor(stage) {
  return STAGE_COLORS[stage]?.dotColor ?? DEFAULT_STAGE_COLOR.dotColor;
}

function StageButton({ stage, selected, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(stage)}
      className={cn(
        "inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded px-2 text-xs motion-reduce:transition-none",
        "transition-colors duration-hover ease-out",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2",
        "dark:focus-visible:outline-1",
        selected ? "bg-surface-0 text-text-1 shadow-sm" : "text-text-2 hover:text-text-1"
      )}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: stageDotColor(stage) }}
        aria-hidden="true"
      />
      <span className="truncate">{stage}</span>
    </button>
  );
}

export function ManualAddFormStagePicker({ stageOptions, stage, setStage }) {
  const [showAll, setShowAll] = useState(false);
  const hasMore = stageOptions.length > MANUAL_ADD_VISIBLE_STAGES;
  const visible = showAll || !hasMore
    ? stageOptions
    : stageOptions.slice(0, MANUAL_ADD_VISIBLE_STAGES);

  if (stageOptions.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <span id="initial-stage-label" className="text-xs font-medium text-text-2">
        Stage
      </span>
      <div
        role="radiogroup"
        aria-labelledby="initial-stage-label"
        className="flex flex-wrap gap-1 rounded-md bg-surface-1 p-0.5"
      >
        {visible.map((s) => (
          <StageButton key={s} stage={s} selected={stage === s} onSelect={setStage} />
        ))}
        {hasMore && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className={cn(
              "inline-flex h-7 items-center gap-0.5 rounded px-2 text-xs text-text-2 motion-reduce:transition-none",
              "transition-colors duration-hover ease-out hover:bg-surface-0 hover:text-text-1",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2",
              "dark:focus-visible:outline-1"
            )}
          >
            More
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
