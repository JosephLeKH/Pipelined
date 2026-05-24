/** Shared test wrappers — mirrors main.jsx provider stack for component tests. */

import { TooltipProvider } from "../components/ui/tooltip";

/** Wrap children with TooltipProvider (required for Radix Tooltip in JSDOM tests). */
export function withTooltipProvider(children) {
  return <TooltipProvider delayDuration={0}>{children}</TooltipProvider>;
}
