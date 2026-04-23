/** Modal showing all keyboard shortcuts organized by scope. Opens on '?'. */

import { useState, useCallback } from "react";

import X from "lucide-react/dist/esm/icons/x";

import { useHotkeys } from "../hooks/useHotkeys";
import { SHORTCUTS, SHORTCUT_SCOPES } from "../lib/shortcuts";
import { MODAL_CARD } from "../lib/designTokens";

function ShortcutHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useHotkeys("?", open, { enabled: !isOpen });
  useHotkeys("Escape", close, { enabled: isOpen });

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={close}
    >
      <div
        className={`w-full max-w-lg ${MODAL_CARD}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={close}
            className="rounded-button p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:hover:text-gray-300"
            aria-label="Close shortcuts"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto px-6 py-4">
          {SHORTCUT_SCOPES.map((scope) => (
            <div key={scope}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {scope}
              </h3>
              <div className="flex flex-col gap-1.5">
                {SHORTCUTS.filter((s) => s.scope === scope).map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {s.label}
                    </kbd>
                    <span className="text-gray-600 dark:text-gray-400">{s.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ShortcutHelp;
