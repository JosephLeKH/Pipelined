/** Platform detection helpers for keyboard affordance labels. */

/** Returns ⌘ on Apple platforms, otherwise Ctrl. */
export function getModKeyLabel() {
  if (typeof navigator === "undefined") return "⌘";
  return /Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘" : "Ctrl";
}
