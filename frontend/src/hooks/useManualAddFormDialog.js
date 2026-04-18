/** Dialog focus management and keyboard behavior for ManualAddForm. */

import { useRef, useEffect, useCallback } from "react";

const FOCUSABLE_SELECTORS = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useManualAddFormDialog({ isOpen, handleClose }) {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => { if (e.key === "Escape") handleClose(); },
    [handleClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.querySelector(FOCUSABLE_SELECTORS)?.focus();
    }
  }, [isOpen]);

  const handleDialogKeyDown = useCallback((e) => {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const els = [...dialogRef.current.querySelectorAll(FOCUSABLE_SELECTORS)];
    if (!els.length) return;
    const [first, last] = [els[0], els[els.length - 1]];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, []);

  const handleOverlayClick = useCallback(
    (e) => { if (e.target === overlayRef.current) handleClose(); },
    [handleClose]
  );

  return { overlayRef, dialogRef, handleDialogKeyDown, handleOverlayClick };
}
