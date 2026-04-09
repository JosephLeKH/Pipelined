/** Custom hook for keyboard shortcuts. Ignores events when focus is in inputs. */
import { useEffect, useRef } from "react";

const IGNORED_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Register a document keydown shortcut.
 * @param {string} key - The e.key value to match.
 * @param {() => void} callback - Fired when the key is pressed outside of inputs.
 * @param {{ enabled?: boolean }} [options]
 */
export function useHotkeys(key, callback, { enabled = true } = {}) {
  const cbRef = useRef(callback);
  useEffect(() => { cbRef.current = callback; });

  useEffect(() => {
    if (!enabled) return;
    function handler(e) {
      const t = e.target;
      if (IGNORED_TAGS.has(t.tagName) || t.isContentEditable) return;
      if (e.key === key) cbRef.current(e);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [key, enabled]);
}
