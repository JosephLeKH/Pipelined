import * as React from "react";
import { cn } from "@/lib/utils";

const INPUT_FOCUS =
  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-600 focus-visible:border-border-3";

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-8 w-full rounded-md border border-border-1 bg-surface-0 px-3 py-1 text-sm text-text-1 shadow-none",
        "transition-[border-color,outline] duration-120 ease-out",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-1",
        "placeholder:text-text-3",
        INPUT_FOCUS,
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
