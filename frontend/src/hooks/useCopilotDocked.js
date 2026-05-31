/** LocalStorage-persisted open state for the docked Co-pilot right rail. */

import { useCallback, useEffect, useState } from "react";

import { COPILOT_DOCKED_OPEN_KEY } from "../lib/constants";

function readOpen() {
  try {
    return localStorage.getItem(COPILOT_DOCKED_OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

function persistOpen(value) {
  try {
    localStorage.setItem(COPILOT_DOCKED_OPEN_KEY, value ? "1" : "0");
  } catch {
    /* ignore quota errors */
  }
}

export function useCopilotDocked() {
  const [open, setOpenState] = useState(readOpen);

  useEffect(() => {
    persistOpen(open);
  }, [open]);

  const setOpen = useCallback((next) => {
    setOpenState((prev) => (typeof next === "function" ? next(prev) : Boolean(next)));
  }, []);

  const toggle = useCallback(() => setOpenState((prev) => !prev), []);

  return { open, setOpen, toggle };
}
