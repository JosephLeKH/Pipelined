/** Floating undo toast with countdown progress bar. Shows after delete or archive actions. */

import { useEffect, useRef, useState } from "react";

import { Button } from "./ui/button";

const TOAST_DURATION_MS = 10000;

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
      className="fixed bottom-6 left-1/2 z-50 w-80 -translate-x-1/2 rounded-lg bg-foreground shadow-md animate-slideInUp"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-sm text-background">{message}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onUndoRef.current()}
          className="shrink-0 text-primary hover:bg-background/10 focus:ring-primary">
          Undo
        </Button>
      </div>
      <div className="h-1 overflow-hidden rounded-b-lg bg-background/20">
        <div
          data-testid="undo-progress-bar"
          className="h-full bg-primary"
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
