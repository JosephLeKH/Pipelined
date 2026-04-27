/** Focus trap hook for modal dialogs.
 *
 * Intercepts Tab/Shift+Tab to cycle focus within the container,
 * sets initial focus on open, and restores focus to the trigger on close.
 */

import { useEffect, useCallback } from "react";

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(containerRef, enabled) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key !== "Tab" || !containerRef.current) return;
      const els = Array.from(containerRef.current.querySelectorAll(FOCUSABLE_SELECTORS));
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    },
    [containerRef],
  );

  useEffect(() => {
    if (!enabled) return;
    const trigger = document.activeElement;
    const first = containerRef.current?.querySelector(FOCUSABLE_SELECTORS);
    first?.focus();
    return () => { trigger?.focus(); };
  }, [enabled, containerRef]);

  return handleKeyDown;
}
