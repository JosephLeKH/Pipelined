/** Hook: keyboard shortcuts for the command palette (Cmd+K, Escape, Arrow keys, Enter). */

import { useEffect } from "react";

/** Registers global keydown handler for command palette navigation. */
export function useCommandPaletteKeyboard({ isOpen, setIsOpen, items, idx, setIdx, activate, close }) {
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const inTextInput = ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        if (inTextInput) return;
        e.preventDefault();
        setIsOpen((o) => !o);
        return;
      }
      if (!isOpen) return;
      if (e.key === "Escape") { close(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, items.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" && items[idx]) activate(items[idx]);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, setIsOpen, items, idx, setIdx, activate, close]);
}
