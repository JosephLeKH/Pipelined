/** LocalStorage-persisted sidebar collapse state with `[` keyboard toggle. */

import { useCallback, useState } from "react";

import { SIDEBAR_COLLAPSED_STORAGE_KEY } from "../lib/constants";
import { useHotkeys } from "./useHotkeys";

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function persistCollapsed(value) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(value));
  } catch {
    /* ignore quota errors */
  }
}

/** Sidebar collapsed state persisted in localStorage; toggled with `[`. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      persistCollapsed(next);
      return next;
    });
  }, []);

  useHotkeys("[", toggle);

  return { collapsed, toggle, setCollapsed };
}
