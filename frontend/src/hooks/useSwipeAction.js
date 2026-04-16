/** Touch-swipe hook for revealing row actions on mobile. */

import { useState, useRef, useCallback, useEffect } from "react";

import {
  SWIPE_THRESHOLD_PX,
  SWIPE_MAX_MS,
  SWIPE_H_TO_V_RATIO,
  SWIPE_REVEAL_PX,
  SWIPE_SNAP_BACK_MS,
} from "../lib/constants";

/**
 * Detects a left swipe on a touch device and exposes offset state
 * so the caller can slide row content to reveal action buttons.
 *
 * @returns {{ offset, revealed, handlers, snapBack, handleAction }}
 */
export function useSwipeAction() {
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const startRef = useRef(null);
  const currentOffsetRef = useRef(0);
  const timerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const snapBack = useCallback(() => {
    clearTimer();
    currentOffsetRef.current = 0;
    setOffset(0);
    setRevealed(false);
  }, [clearTimer]);

  // Auto-snap-back after timeout when revealed
  useEffect(() => {
    if (revealed) {
      timerRef.current = setTimeout(snapBack, SWIPE_SNAP_BACK_MS);
    }
    return () => clearTimer();
  }, [revealed, snapBack, clearTimer]);

  const handleTouchStart = useCallback((e) => {
    startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
    clearTimer();
  }, [clearTimer]);

  const handleTouchMove = useCallback((e) => {
    if (!startRef.current) return;
    const dx = e.touches[0].clientX - startRef.current.x;
    const dy = e.touches[0].clientY - startRef.current.y;
    if (dx > 0) { currentOffsetRef.current = 0; setOffset(0); return; }
    if (Math.abs(dx) < Math.abs(dy) * SWIPE_H_TO_V_RATIO) return;
    e.preventDefault();
    const clamped = Math.max(dx, -SWIPE_REVEAL_PX);
    currentOffsetRef.current = clamped;
    setOffset(clamped);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!startRef.current) return;
    const elapsed = Date.now() - startRef.current.time;
    startRef.current = null;
    if (elapsed < SWIPE_MAX_MS && Math.abs(currentOffsetRef.current) >= SWIPE_THRESHOLD_PX) {
      currentOffsetRef.current = -SWIPE_REVEAL_PX;
      setOffset(-SWIPE_REVEAL_PX);
      setRevealed(true);
    } else {
      snapBack();
    }
  }, [snapBack]);

  /** Call this from an action button; runs the action then snaps back. */
  const handleAction = useCallback((fn) => {
    snapBack();
    fn();
  }, [snapBack]);

  const handlers = { onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd };

  return { offset, revealed, handlers, snapBack, handleAction };
}
