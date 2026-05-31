/** Vertical drag handle on the left edge of the Co-pilot drawer. */

import { useCallback } from "react";

import { COPILOT_DRAWER_CLOSE_THRESHOLD_PX } from "../../lib/constants";

function CopilotResizeHandle({ width, onResize, onCloseRequest }) {
  const handlePointerDown = useCallback(
    (event) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = width;

      const cleanup = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      const handleMove = (moveEvent) => {
        const next = startWidth - (moveEvent.clientX - startX);
        if (next < COPILOT_DRAWER_CLOSE_THRESHOLD_PX) {
          onCloseRequest();
          cleanup();
          return;
        }
        onResize(next);
      };
      const handleUp = () => cleanup();

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [width, onResize, onCloseRequest],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize Co-pilot"
      data-testid="copilot-resize-handle"
      onPointerDown={handlePointerDown}
      className="hidden w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-brand-400/40 active:bg-brand-500/60 motion-reduce:transition-none md:block"
    />
  );
}

export default CopilotResizeHandle;
