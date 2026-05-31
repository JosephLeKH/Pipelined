/** Info popover explaining what the morning brief tracks. */

import Info from "lucide-react/dist/esm/icons/info";

import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { BRIEF_SIGNALS } from "../lib/briefConstants";

function BriefInfoPopover({ open, onOpenChange }) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="What does the morning brief track?"
          className={[
            "rounded-full p-1 text-text-3 hover:text-text-1",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600",
            "motion-safe:transition-colors motion-safe:duration-hover",
          ].join(" ")}
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-medium text-text-1">What's in your brief</p>
        <p className="mt-1 text-xs text-text-3">
          Each morning, Pipelined scans your pipeline and surfaces what needs attention today.
        </p>
        <ul className="mt-3 space-y-1.5">
          {BRIEF_SIGNALS.map((signal) => (
            <li key={signal.label} className="text-xs leading-snug">
              <span className="font-medium text-text-1">{signal.label}</span>
              <span className="text-text-3"> — {signal.description}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-text-3">
          Empty sections mean nothing in your pipeline matches them yet.
        </p>
      </PopoverContent>
    </Popover>
  );
}

export default BriefInfoPopover;
