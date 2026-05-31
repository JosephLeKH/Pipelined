import * as React from "react";
import { cn } from "@/lib/utils";

const CHECKBOX_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

const Checkbox = React.forwardRef(function Checkbox(
  { className, checked, onCheckedChange, ...props },
  ref
) {
  const innerRef = React.useRef(null);

  React.useEffect(() => {
    if (innerRef.current) {
      innerRef.current.indeterminate = checked === "indeterminate";
    }
  }, [checked]);

  return (
    <input
      type="checkbox"
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className={cn(
        "peer h-3.5 w-3.5 shrink-0 rounded-sm border border-border-1 accent-brand-600",
        "bg-surface-0 transition-[border-color,background-color] duration-120 ease-out",
        CHECKBOX_FOCUS,
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      checked={checked === "indeterminate" ? false : (checked ?? false)}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  );
});

Checkbox.displayName = "Checkbox";

export { Checkbox };
