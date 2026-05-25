/** Command palette dialog shell — backdrop, search input, results list. */

import SearchIcon from "lucide-react/dist/esm/icons/search";

import { Input } from "./ui/input";
import CommandPaletteResults from "./CommandPaletteResults";

function CommandPaletteDialog({
  query,
  setQuery,
  filteredApps,
  quickActions,
  navItems,
  recentApps,
  settingsItems,
  idx,
  activate,
  close,
  highlightRef,
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 cursor-pointer bg-black/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border-2 bg-surface-0 shadow-modal"
      >
        <div className="flex h-12 items-center gap-2 border-b border-border-1 px-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-text-3" aria-hidden="true" />
          <Input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            aria-label="Search commands"
            className="h-12 w-full rounded-none border-0 bg-transparent px-0 text-base text-text-1 shadow-none focus-visible:ring-0"
          />
        </div>
        <div role="listbox" aria-label="Search results" className="max-h-80 overflow-y-auto py-1">
          <CommandPaletteResults
            query={query}
            filteredApps={filteredApps}
            quickActions={quickActions}
            navItems={navItems}
            recentApps={recentApps}
            settingsItems={settingsItems}
            idx={idx}
            activate={activate}
            highlightRef={highlightRef}
          />
        </div>
      </div>
    </>
  );
}

export default CommandPaletteDialog;
