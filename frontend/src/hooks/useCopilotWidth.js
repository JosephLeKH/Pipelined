/** LocalStorage-persisted Co-pilot drawer width with drag-to-resize support. */

import { useCallback, useState } from "react";

import {
  COPILOT_DRAWER_WIDTH_MAX_PX,
  COPILOT_DRAWER_WIDTH_MIN_PX,
  COPILOT_DRAWER_WIDTH_PX,
  COPILOT_WIDTH_STORAGE_KEY,
} from "../lib/constants";

function clampWidth(value) {
  if (!Number.isFinite(value)) return COPILOT_DRAWER_WIDTH_PX;
  return Math.max(
    COPILOT_DRAWER_WIDTH_MIN_PX,
    Math.min(COPILOT_DRAWER_WIDTH_MAX_PX, value),
  );
}

function readWidth() {
  try {
    const stored = localStorage.getItem(COPILOT_WIDTH_STORAGE_KEY);
    return stored ? clampWidth(Number(stored)) : COPILOT_DRAWER_WIDTH_PX;
  } catch {
    return COPILOT_DRAWER_WIDTH_PX;
  }
}

function persistWidth(value) {
  try {
    localStorage.setItem(COPILOT_WIDTH_STORAGE_KEY, String(value));
  } catch {
    /* ignore quota errors */
  }
}

export function useCopilotWidth() {
  const [width, setWidthState] = useState(readWidth);

  const setWidth = useCallback((next) => {
    const clamped = clampWidth(next);
    setWidthState(clamped);
    persistWidth(clamped);
  }, []);

  return { width, setWidth };
}
