/** Modal showing all keyboard shortcuts organized by scope. Opens on '?' or FAB click. */

import { useState, useCallback } from "react";

import Keyboard from "lucide-react/dist/esm/icons/keyboard";

import { useHotkeys } from "../hooks/useHotkeys";
import { SHORTCUTS, SHORTCUT_SCOPES } from "../lib/shortcuts";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

function ShortcutHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useHotkeys("?", open, { enabled: !isOpen });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={open}
        aria-label="Show keyboard shortcuts"
        className="fixed bottom-5 right-5 z-40 h-9 w-9 rounded-full shadow-md"
      >
        <Keyboard className="h-4 w-4" aria-hidden="true" />
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
        <DialogContent className="gap-0 p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto px-6 py-5">
            {SHORTCUT_SCOPES.map((scope) => {
              const items = SHORTCUTS.filter((s) => s.scope === scope);
              return (
                <div key={scope}>
                  <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {scope}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {items.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{s.description}</span>
                        <kbd className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                          {s.label}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ShortcutHelp;
