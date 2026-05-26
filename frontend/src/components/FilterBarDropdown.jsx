/** Reusable inline filter dropdown trigger + checkbox menu for FilterBar. */

import * as React from "react";

import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import { cn } from "../lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const TRIGGER_CLASS =
  "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-normal text-text-2 bg-transparent hover:bg-surface-1 hover:text-text-1 motion-reduce:transition-none transition-colors duration-hover ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

export function formatMultiSelectLabel(selected, allLabel = "All") {
  if (!selected.length) return allLabel;
  if (selected.length === 1) return selected[0];
  return `${selected.length} selected`;
}

function TriggerContent({ label, value }) {
  return (
    <>
      <span className="text-text-3">{label}:</span>
      <span className="font-medium text-text-1">{value}</span>
      <ChevronDown className="h-3 w-3 text-text-3" aria-hidden="true" />
    </>
  );
}

export function MultiSelectFilterDropdown({
  label,
  paramKey,
  options,
  selected,
  onToggle,
  allLabel = "All",
}) {
  const displayValue = formatMultiSelectLabel(selected, allLabel);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger type="button" className={TRIGGER_CLASS}>
        <TriggerContent label={label} value={displayValue} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt}
            checked={selected.includes(opt)}
            onCheckedChange={(checked) => onToggle(paramKey, opt, checked)}
            onSelect={(e) => e.preventDefault()}
          >
            {opt}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SingleSelectFilterDropdown({ label, displayValue, children, contentClassName }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger type="button" className={TRIGGER_CLASS}>
        <TriggerContent label={label} value={displayValue} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={cn("min-w-[10rem]", contentClassName)}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
