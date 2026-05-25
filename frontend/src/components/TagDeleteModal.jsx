/** Confirm dialog before removing a tag from all applications. */

import { useEffect, useRef } from "react";

import { Button } from "./ui/button";

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function TagDeleteModal({ tag, count, onConfirm, onCancel, isPending }) {
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    triggerRef.current = document.activeElement;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const getFocusable = () => [...dialog.querySelectorAll(FOCUSABLE_SELECTORS)];

    const elements = getFocusable();
    if (elements.length > 0) elements[0].focus();

    const handleKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, []);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-tag-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
    >
      <div className="relative mx-auto w-full max-w-sm rounded-xl border border-border-1 bg-surface-0 p-6 shadow-popover">
        <h3 id="delete-tag-heading" className="text-lg font-semibold text-text-1">
          Delete tag
        </h3>
        <p className="mt-2 text-sm text-text-2">
          This will remove{" "}
          <span className="font-medium text-text-1">&ldquo;{tag}&rdquo;</span> from {count}{" "}
          {count === 1 ? "application" : "applications"}. This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TagDeleteModal;
