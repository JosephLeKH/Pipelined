/** Collapsible textarea field — default collapsed (job description, notes). */

import { useState } from "react";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";

import { cn } from "../lib/utils";

export function ManualAddFormCollapsibleField({
  label,
  htmlFor,
  value,
  onChange,
  placeholder,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={htmlFor}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex h-7 items-center gap-1 self-start rounded-md px-2 text-xs font-medium text-text-2",
          "motion-reduce:transition-none transition-colors duration-hover ease-out hover:bg-surface-1 hover:text-text-1",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2",
          "dark:focus-visible:outline-1"
        )}
      >
        {label}
        <ChevronDown
          className={cn("h-3 w-3 motion-reduce:transition-none transition-transform duration-hover", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open && (
        <textarea
          id={htmlFor}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className={cn(
            "w-full resize-y rounded-md border border-border-1 bg-transparent px-3 py-2 text-sm text-text-1",
            "placeholder:text-text-3 motion-reduce:transition-none transition-[border-color] duration-hover",
            "focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-600 focus-visible:border-border-3"
          )}
        />
      )}
    </div>
  );
}
