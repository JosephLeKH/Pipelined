/** Four-segment source control for ManualAddForm (Manual / Extension / Email / Board). */

import { MANUAL_ADD_SOURCE_OPTIONS } from "../lib/constants";
import { cn } from "../lib/utils";

export function ManualAddFormSourcePicker({ source, setSource }) {
  const segmentClass = (active) =>
    cn(
      "inline-flex h-7 flex-1 items-center justify-center rounded px-2 text-xs motion-reduce:transition-none",
      "transition-colors duration-hover ease-out",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2",
      "dark:focus-visible:outline-1",
      active ? "bg-surface-0 text-text-1 shadow-sm" : "text-text-2 hover:text-text-1"
    );

  return (
    <div className="flex flex-col gap-1.5">
      <span id="source-label" className="text-xs font-medium text-text-2">
        Source
      </span>
      <div
        role="radiogroup"
        aria-labelledby="source-label"
        className="flex rounded-md bg-surface-1 p-0.5"
      >
        {MANUAL_ADD_SOURCE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={source === value}
            onClick={() => setSource(value)}
            className={segmentClass(source === value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
