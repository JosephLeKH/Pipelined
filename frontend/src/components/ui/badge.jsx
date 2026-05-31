import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1",
  {
    variants: {
      variant: {
        solid:
          "border border-transparent bg-brand-600 text-white",
        soft:
          "border border-transparent bg-brand-100 text-brand-900",
        dot:
          "border-0 bg-transparent px-0 py-0 text-text-2 before:inline-block before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-status-neutral before:content-['']",
        outline:
          "border border-border-1 bg-transparent text-text-1",
        secondary:
          "border border-transparent bg-surface-2 text-text-1",
        destructive:
          "border border-transparent bg-brand-50 text-brand-700",
        success:
          "border border-transparent bg-surface-2 text-status-success before:inline-block before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-status-success before:content-['']",
        warning:
          "border border-transparent bg-surface-2 text-status-warn before:inline-block before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-status-warn before:content-['']",
        info:
          "border border-transparent bg-surface-2 text-status-info before:inline-block before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-status-info before:content-['']",
      },
    },
    defaultVariants: {
      variant: "soft",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
