/** Collapsible wrapper grouping AI sections in the detail panel. */

import { useState } from "react";

import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";

const AI_PANEL_LABEL = "AI";

function AiPanelGroup({ children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section aria-label={AI_PANEL_LABEL} className="border-t border-border-1 pt-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 pb-2 text-left motion-reduce:transition-none transition-colors duration-hover ease-out hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-3" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-3" aria-hidden="true" />
        )}
        <span className="flex items-center gap-2 text-sm font-semibold tracking-[-0.01em] text-text-1">
          <Sparkles className="h-4 w-4 text-brand-600" aria-hidden="true" />
          {AI_PANEL_LABEL}
        </span>
      </button>
      {open && <div className="flex flex-col gap-4 pb-2">{children}</div>}
    </section>
  );
}

export default AiPanelGroup;
