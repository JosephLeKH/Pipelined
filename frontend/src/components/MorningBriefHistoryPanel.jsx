/** Right drawer listing previous morning briefs from GET /api/brief/history. */

import { useEffect, useRef } from "react";

import X from "lucide-react/dist/esm/icons/x";

import { useBriefHistory } from "../hooks/useBriefHistory";
import { DRAWER_ANIMATION_MS } from "../lib/constants";
import { Button } from "./ui/button";

const HISTORY_DAYS = 7;
const DRAWER_WIDTH_PX = 480;

function MorningBriefHistoryPanel({ open, onClose }) {
  const panelRef = useRef(null);
  const { data, isLoading, isError, refetch } = useBriefHistory(HISTORY_DAYS);
  const briefs = data?.data ?? [];
  const pastBriefs = briefs.slice(1);
  const hasHistory = !isLoading && !isError && pastBriefs.length > 0;
  const showError = !isLoading && isError;

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [open]);

  if (!open) return null;
  if (!hasHistory && !showError) return null;

  return (
    <div
      className={[
        "fixed inset-0 z-40 motion-safe:transition-opacity",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
      style={{ transitionDuration: `${DRAWER_ANIMATION_MS}ms` }}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/30 motion-reduce:transition-none"
        aria-label="Close brief history"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Previous briefs"
        tabIndex={-1}
        className={[
          "fixed right-0 top-0 flex h-full flex-col border-l border-border-1",
          "bg-surface-0 shadow-modal motion-safe-drawer focus:outline-none",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        style={{ width: `${DRAWER_WIDTH_PX}px`, maxWidth: "100vw" }}
      >
        <div className="flex items-center justify-between border-b border-border-1 px-4 py-3">
          <h2 className="text-sm font-semibold text-text-1">Previous briefs</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={onClose}
            className="h-8 w-8 text-text-2"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {showError ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-6">
              <p className="text-sm text-destructive">Couldn&apos;t load brief history</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-xs text-brand-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                Try again
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-border-1">
              {pastBriefs.map((brief) => (
                <li key={brief.date} className="px-4 py-3">
                  <p className="text-sm font-medium text-text-1">{brief.date}</p>
                  <p className="mt-0.5 text-xs text-text-3">{brief.summary_line}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

export { HISTORY_DAYS };
export default MorningBriefHistoryPanel;
