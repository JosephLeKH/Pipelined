/** Keyboard/focus management hook for DetailPanel: Escape, hotkeys, auto-focus, focus trap, overlay click. */

import { useEffect, useCallback } from "react";

import { useHotkeys } from "./useHotkeys";

const FOCUSABLE_SELECTORS = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useFocusTrap(panelRef) {
  return useCallback((e) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const els = Array.from(panelRef.current.querySelectorAll(FOCUSABLE_SELECTORS));
    if (!els.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, [panelRef]);
}

export function useDetailPanelKeyboard(panelRef, overlayRef, confirmClose, panelOpen) {
  const handlePanelKeyDown = useFocusTrap(panelRef);

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

  useEffect(() => {
    if (!panelOpen) return;
    const previouslyFocused = document.activeElement;
    if (panelRef.current) {
      const first = panelRef.current.querySelector(FOCUSABLE_SELECTORS);
      first?.focus();
    }
    return () => { previouslyFocused?.focus(); };
  }, [panelOpen, panelRef]);

  const handleOverlayClick = useCallback(
    (e) => { if (e.target === overlayRef.current) confirmClose(); },
    [overlayRef, confirmClose]
  );

  return { handlePanelKeyDown, handleOverlayClick };
}
