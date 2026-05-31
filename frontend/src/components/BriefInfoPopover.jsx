/** Info tooltip explaining what the morning brief tracks. Opens on hover. */

import Info from "lucide-react/dist/esm/icons/info";

import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { BRIEF_SIGNALS } from "../lib/briefConstants";

function BriefInfoPopover() {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="What does the morning brief track?"
          className="ml-1.5 inline-flex h-4 w-4 items-center justify-center align-middle text-text-3 hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 motion-safe:transition-colors motion-safe:duration-hover"
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-80 rounded-md border border-border-1 bg-surface-1 p-4 text-text-1 shadow-popover"
      >
        <p className="text-sm font-medium text-text-1">What's in your brief</p>
        <p className="mt-1 text-xs text-text-3">
          Pipelined scans your pipeline every morning and surfaces what needs attention.
        </p>
        <ul className="mt-3 space-y-2">
          {BRIEF_SIGNALS.map((signal) => (
            <li key={signal.label} className="text-xs leading-snug">
              <div className="font-medium text-text-1">{signal.label}</div>
              <div className="text-text-3">{signal.description}</div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-text-3">
          Sections stay empty until your pipeline matches them.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export default BriefInfoPopover;
