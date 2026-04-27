/** Keyboard/focus management hook for DetailPanel: Escape, hotkeys, auto-focus, focus trap, overlay click. */

import { useEffect, useCallback } from "react";

import { useHotkeys } from "./useHotkeys";
import { useFocusTrap } from "./useFocusTrap";

export function useDetailPanelKeyboard(panelRef, overlayRef, confirmClose, panelOpen) {
  const handlePanelKeyDown = useFocusTrap(panelRef, panelOpen);

  const handleKeyDown = useCallback(
    (e) => { if (e.key === "Escape") confirmClose(); },
    [confirmClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useHotkeys("s", () => { document.getElementById("stage-select")?.focus(); }, { enabled: panelOpen });
  useHotkeys("n", () => {
    const editBtn = document.querySelector("[aria-label='Edit notes']");
    if (editBtn) { editBtn.click(); } else { document.getElementById("notes-textarea")?.focus(); }
  }, { enabled: panelOpen });

  const handleOverlayClick = useCallback(
    (e) => { if (e.target === overlayRef.current) confirmClose(); },
    [overlayRef, confirmClose]
  );

  return { handlePanelKeyDown, handleOverlayClick };
}
