/** Collapsible panel listing previous morning briefs from GET /api/brief/history. */

import { useState } from "react";

import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";

import { useBriefHistory } from "../hooks/useBriefHistory";
import { CARD_BASE } from "../lib/designTokens";
import { Button } from "./ui/button";

const HISTORY_DAYS = 7;

function MorningBriefHistoryPanel() {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useBriefHistory(HISTORY_DAYS);
  const briefs = data?.data ?? [];
  const pastBriefs = briefs.slice(1);

  if (isLoading || isError || pastBriefs.length === 0) {
    return null;
  }

  const ToggleIcon = open ? ChevronDown : ChevronRight;

  return (
    <section aria-label="Previous briefs" className={`${CARD_BASE} overflow-hidden`}>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex h-auto w-full items-center justify-between rounded-none px-4 py-3.5 text-left hover:bg-surface-1/60"
      >
        <span className=" text-sm font-semibold text-foreground">
          Previous briefs
        </span>
        <ToggleIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </Button>

      {open && (
        <ul className="divide-y divide-border-1 border-t border-border-1">
          {pastBriefs.map((brief) => (
            <li key={brief.date} className="px-4 py-3">
              <p className="text-sm font-medium text-foreground">{brief.date}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{brief.summary_line}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default MorningBriefHistoryPanel;
