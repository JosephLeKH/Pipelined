/** Floating undo toast with countdown progress bar. Shows after delete or archive actions. */

import { useEffect, useRef, useState } from "react";

const TOAST_DURATION_MS = 5000;

function UndoToast({ message, onUndo, onDismiss, duration = TOAST_DURATION_MS }) {
  const [barWidth, setBarWidth] = useState(100);
  const onDismissRef = useRef(onDismiss);
  const onUndoRef = useRef(onUndo);

  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);
  useEffect(() => { onUndoRef.current = onUndo; }, [onUndo]);

  useEffect(() => {
    let rafId1, rafId2;
    rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => setBarWidth(0));
    });
    const timerId = setTimeout(() => onDismissRef.current(), duration);
    return () => {
      cancelAnimationFrame(rafId1);
      cancelAnimationFrame(rafId2);
      clearTimeout(timerId);
    };
  }, [duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="undo-toast"
      className="fixed bottom-6 left-1/2 z-50 w-80 -translate-x-1/2 rounded-lg bg-gray-900 shadow-md animate-slideInUp"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-sm text-white">{message}</span>
        <button
          type="button"
          onClick={() => onUndoRef.current()}
          className="shrink-0 rounded px-2 py-1 text-sm font-medium text-brand-400 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          Undo
        </button>
      </div>
      <div className="h-1 overflow-hidden rounded-b-lg bg-gray-700">
        <div
          data-testid="undo-progress-bar"
          className="h-full bg-brand-500"
          style={{
            width: `${barWidth}%`,
            transition: barWidth === 0 ? `width ${duration}ms linear` : "none",
          }}
        />
      </div>
    </div>
  );
}

export default UndoToast;
