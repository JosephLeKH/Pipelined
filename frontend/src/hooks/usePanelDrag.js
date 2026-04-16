/** Touch drag-to-dismiss hook for the mobile bottom sheet panel. */

import { useState, useRef, useCallback } from "react";

import { DRAG_DISMISS_PX } from "../lib/constants";

/**
 * Detects a downward drag gesture and dismisses the panel when
 * the user drags past DRAG_DISMISS_PX.
 *
 * @param {() => void} onDismiss - called when drag exceeds threshold
 * @returns {{ dragOffset, reset, handlers }}
 */
export function usePanelDrag(onDismiss) {
  const [dragOffset, setDragOffset] = useState(0);
  const startYRef = useRef(null);
  const lastOffsetRef = useRef(0);

  const reset = useCallback(() => {
    setDragOffset(0);
    lastOffsetRef.current = 0;
  }, []);

  const handleTouchStart = useCallback((e) => {
    startYRef.current = e.touches[0].clientY;
    lastOffsetRef.current = 0;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startYRef.current === null) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy <= 0) return;
    e.preventDefault();
    lastOffsetRef.current = dy;
    setDragOffset(dy);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (startYRef.current === null) return;
    startYRef.current = null;
    const last = lastOffsetRef.current;
    lastOffsetRef.current = 0;
    setDragOffset(0);
    if (last >= DRAG_DISMISS_PX) onDismiss();
  }, [onDismiss]);

  return {
    dragOffset,
    reset,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
