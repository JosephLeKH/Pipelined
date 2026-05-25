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

const KBD_CLASS =
  "shrink-0 rounded-sm border border-border-1 bg-surface-1 px-1.5 py-0.5 font-mono text-[11px] text-text-1";

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
        className="fixed bottom-20 right-6 z-40 h-9 w-9 rounded-full shadow-md"
      >
        <Keyboard className="h-4 w-4" aria-hidden="true" />
      </Button>

      <Dialog open={isOpen} onOpenChange={(nextOpen) => { if (!nextOpen) close(); }}>
        <DialogContent className="gap-0 p-0 sm:max-w-[560px]">
          <DialogHeader className="border-b border-border-1 px-6 py-4">
            <DialogTitle className="text-base font-semibold text-text-1">
              Keyboard shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto px-6 py-5">
            {SHORTCUT_SCOPES.map((scope) => {
              const items = SHORTCUTS.filter((s) => s.scope === scope);
              return (
                <div key={scope}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-3">
                    {scope}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {items.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-[13px]">
                        <span className="text-text-2">{s.description}</span>
                        <kbd className={KBD_CLASS}>{s.label}</kbd>
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
