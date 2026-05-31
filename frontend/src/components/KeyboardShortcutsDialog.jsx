/** Keyboard shortcuts help dialog — opens on '?' keypress. */

import { SHORTCUTS, SHORTCUT_SCOPES } from "../lib/shortcuts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

function ShortcutItem({ shortcut }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 px-3 text-sm">
      <div className="flex flex-col">
        <span className="font-mono font-semibold text-text-1">{shortcut.label}</span>
        <span className="text-xs text-text-3">{shortcut.description}</span>
      </div>
    </div>
  );
}

function KeyboardShortcutsDialog({ open, onOpenChange }) {
  const groupedShortcuts = SHORTCUT_SCOPES.map((scope) => ({
    scope,
    shortcuts: SHORTCUTS.filter((s) => s.scope === scope),
  })).filter((group) => group.shortcuts.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] w-full max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {groupedShortcuts.map(({ scope, shortcuts }) => (
            <div key={scope}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-2">
                {scope}
              </h3>
              <div className="space-y-1 rounded-lg bg-surface-2">
                {shortcuts.map((shortcut) => (
                  <ShortcutItem key={`${scope}-${shortcut.key}`} shortcut={shortcut} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsDialog;
