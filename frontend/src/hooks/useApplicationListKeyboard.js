/** Keyboard navigation shortcuts (j/k/Enter/x/Escape) for ApplicationList. */

import { useEffect } from "react";
import { useHotkeys } from "./useHotkeys";

export function useApplicationListKeyboard({
  applications, shortcutsEnabled, focusedIdx, setFocusedIdx, listRef, onSelect, handleToggle,
}) {
  useEffect(() => { setFocusedIdx(-1); }, [applications.length, setFocusedIdx]);

  useHotkeys("j", () => {
    setFocusedIdx((prev) => {
      const n = Math.min(prev + 1, applications.length - 1);
      listRef.current?.scrollToItem(n, "smart");
      return n;
    });
  }, { enabled: shortcutsEnabled });

  useHotkeys("k", () => {
    setFocusedIdx((prev) => {
      const n = Math.max(prev - 1, 0);
      listRef.current?.scrollToItem(n, "smart");
      return n;
    });
  }, { enabled: shortcutsEnabled });

  useHotkeys("Enter", () => {
    if (focusedIdx >= 0 && focusedIdx < applications.length) onSelect(applications[focusedIdx]);
  }, { enabled: shortcutsEnabled });

  useHotkeys("x", () => {
    if (focusedIdx >= 0 && focusedIdx < applications.length) handleToggle(applications[focusedIdx].id);
  }, { enabled: shortcutsEnabled });

  useHotkeys("Escape", () => setFocusedIdx(-1), { enabled: shortcutsEnabled && focusedIdx >= 0 });
}
