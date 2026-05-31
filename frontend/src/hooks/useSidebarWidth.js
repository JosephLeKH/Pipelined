/** LocalStorage-persisted sidebar width with drag-to-resize support. */

import { useCallback, useState } from "react";

import {
  SIDEBAR_WIDTH_STORAGE_KEY,
  SIDEBAR_WIDTH_PX,
  SIDEBAR_WIDTH_MIN_PX,
  SIDEBAR_WIDTH_MAX_PX,
} from "../lib/constants";

function clampWidth(value) {
  if (!Number.isFinite(value)) return SIDEBAR_WIDTH_PX;
  return Math.max(SIDEBAR_WIDTH_MIN_PX, Math.min(SIDEBAR_WIDTH_MAX_PX, value));
}

function readWidth() {
  try {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    return stored ? clampWidth(Number(stored)) : SIDEBAR_WIDTH_PX;
  } catch {
    return SIDEBAR_WIDTH_PX;
  }
}

function persistWidth(value) {
  try {
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(value));
  } catch {
    /* ignore quota errors */
  }
}

export function useSidebarWidth() {
  const [width, setWidthState] = useState(readWidth);

  const setWidth = useCallback((next) => {
    const clamped = clampWidth(next);
    setWidthState(clamped);
    persistWidth(clamped);
  }, []);

  return { width, setWidth };
}
