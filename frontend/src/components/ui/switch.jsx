import * as React from "react";
import { cn } from "@/lib/utils";

const SWITCH_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

const THUMB_OFFSET_OFF = "translate-x-0.5";
const THUMB_OFFSET_ON = "translate-x-3.5";

const Switch = React.forwardRef(function Switch(
  { className, checked, onCheckedChange, disabled, id, ...props },
  ref
) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      ref={ref}
      aria-checked={checked ?? false}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full",
        "transition-[background-color] duration-hover ease-out",
        "disabled:cursor-not-allowed disabled:opacity-50",
        SWITCH_FOCUS,
        checked ? "bg-brand-600" : "bg-surface-2 border border-border-1",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none inline-block h-3 w-3 rounded-full bg-surface-0 shadow-sm",
          "transition-transform duration-hover ease-out",
          checked ? THUMB_OFFSET_ON : THUMB_OFFSET_OFF
        )}
      />
    </button>
  );
});

Switch.displayName = "Switch";

export { Switch };
