/** Collapsible wrapper grouping AI sections in the detail panel. */

import { useState } from "react";

import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";

import { CARD_BASE } from "../lib/designTokens";

const AI_PANEL_LABEL = "AI insights";

function AiPanelGroup({ children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section aria-label={AI_PANEL_LABEL} className={`${CARD_BASE} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-brand-500" aria-hidden="true" />
          {AI_PANEL_LABEL}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
          {children}
        </div>
      )}
    </section>
  );
}

export default AiPanelGroup;
