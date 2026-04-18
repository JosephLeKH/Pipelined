/** Mobile swipe navigation state and handlers for KanbanBoard. */

import { useState, useRef, useCallback } from "react";
import { SWIPE_THRESHOLD_PX, SWIPE_MAX_MS, SWIPE_H_TO_V_RATIO } from "../lib/constants";

export function useKanbanMobileSwipe(stages) {
  const [mobileStage, setMobileStage] = useState(stages[0] ?? "");
  const mobileSwipeRef = useRef(null);

  const handleMobileTouchStart = useCallback((e) => {
    mobileSwipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
  }, []);

  const handleMobileTouchEnd = useCallback((e) => {
    if (!mobileSwipeRef.current) return;
    const { x: startX, y: startY, time } = mobileSwipeRef.current;
    mobileSwipeRef.current = null;
    const elapsed = Date.now() - time;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (elapsed > SWIPE_MAX_MS) return;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (Math.abs(dx) < Math.abs(dy) * SWIPE_H_TO_V_RATIO) return;
    const idx = stages.indexOf(mobileStage);
    if (dx < 0 && idx < stages.length - 1) setMobileStage(stages[idx + 1]);
    if (dx > 0 && idx > 0) setMobileStage(stages[idx - 1]);
  }, [stages, mobileStage]);

  return { mobileStage, setMobileStage, handleMobileTouchStart, handleMobileTouchEnd };
}
