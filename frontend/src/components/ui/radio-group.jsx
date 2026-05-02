import { cn } from "@/lib/utils";

export function RadioGroup({ className, ...props }) {
  return <div role="radiogroup" className={cn("flex flex-col gap-2", className)} {...props} />;
}

export function RadioGroupItem({ className, ...props }) {
  return (
    <input
      type="radio"
      className={cn("h-4 w-4 accent-primary cursor-pointer", className)}
      {...props}
    />
  );
}
