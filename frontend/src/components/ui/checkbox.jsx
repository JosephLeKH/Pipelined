import * as React from "react";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef(function Checkbox({ className, checked, onCheckedChange, ...props }, ref) {
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
        "peer h-4 w-4 shrink-0 rounded-sm border border-primary accent-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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
