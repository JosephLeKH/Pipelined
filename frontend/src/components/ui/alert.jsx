import * as React from "react";
import { cn } from "@/lib/utils";

const VARIANT_CLASSES = {
  default: "bg-card border border-border text-foreground",
  destructive:
    "border-destructive/50 text-destructive dark:border-destructive bg-destructive/5",
};

function Alert({ className, variant = "default", ...props }) {
  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4",
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }) {
  return (
    <div
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }) {
  return (
    <div
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
