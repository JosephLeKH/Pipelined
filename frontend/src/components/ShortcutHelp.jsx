/** Modal showing all keyboard shortcuts organized by scope. Opens on '?' or FAB click. */

import { useState, useCallback } from "react";

import Keyboard from "lucide-react/dist/esm/icons/keyboard";
import X from "lucide-react/dist/esm/icons/x";

import { useHotkeys } from "../hooks/useHotkeys";
import { SHORTCUTS, SHORTCUT_SCOPES } from "../lib/shortcuts";
import { BUTTON_GHOST, MODAL_BACKDROP, MODAL_CARD } from "../lib/designTokens";

function ShortcutHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useHotkeys("?", open, { enabled: !isOpen });
  useHotkeys("Escape", close, { enabled: isOpen });

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Show keyboard shortcuts"
        className="fixed bottom-5 right-5 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-border-default bg-white shadow-md transition-colors hover:bg-gray-100 dark:bg-dark-surface dark:hover:bg-gray-700"
      >
        <Keyboard className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          className={`${MODAL_BACKDROP} cursor-pointer`}
          onClick={close}
        >
          <div
            className={`w-full max-w-lg ${MODAL_CARD}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-default px-6 py-4">
              <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100">
                Keyboard Shortcuts
              </h2>
              <button
                type="button"
                onClick={close}
                className={`${BUTTON_GHOST} p-2`}
                aria-label="Close shortcuts"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto px-6 py-5 font-sans">
              {SHORTCUT_SCOPES.map((scope) => {
                const items = SHORTCUTS.filter((s) => s.scope === scope);
                return (
                  <div key={scope}>
                    <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {scope}
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {items.map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{s.description}</span>
                          <kbd className="ml-2 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            {s.label}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ShortcutHelp;
