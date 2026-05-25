/** Sonner undo toast — replaces legacy UndoToast component (PRD-10). */

import { toast } from "sonner";

import { UNDO_TOAST_DURATION_MS } from "./constants";

/**
 * @param {string} message
 * @param {{ onUndo?: () => void, onDismiss?: () => void, duration?: number }} options
 * @returns {string|number} toast id for dismissal
 */
export function showUndoToast(message, { onUndo, onDismiss, duration = UNDO_TOAST_DURATION_MS } = {}) {
  let undone = false;
  return toast(message, {
    duration,
    action: {
      label: "Undo",
      onClick: () => {
        undone = true;
        onUndo?.();
      },
    },
    onDismiss: () => {
      if (!undone) onDismiss?.();
    },
  });
}
