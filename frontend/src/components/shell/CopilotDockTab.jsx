/** Vertical tab on the right edge that toggles the docked Co-pilot panel. */

import Bot from "lucide-react/dist/esm/icons/bot";

function CopilotDockTab({ open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? "Close Co-pilot" : "Open Co-pilot"}
      aria-pressed={open}
      data-testid="copilot-dock-tab"
      className={
        "hidden md:flex h-full w-8 shrink-0 flex-col items-center justify-center gap-3 " +
        "border-l border-border-1 bg-surface-1 text-text-2 transition-colors " +
        "hover:bg-surface-2 hover:text-text-1 " +
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-[-2px] " +
        (open ? "text-brand-700 bg-surface-2" : "")
      }
    >
      <Bot className="h-4 w-4" aria-hidden="true" />
      <span
        className="text-[11px] font-medium uppercase tracking-[0.08em]"
        style={{ writingMode: "vertical-rl" }}
      >
        Co-pilot
      </span>
    </button>
  );
}

export default CopilotDockTab;
