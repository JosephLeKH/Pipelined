/** Vertical drag handle that resizes the sidebar via pointer events. */

import { useCallback } from "react";

function SidebarResizeHandle({ width, onResize }) {
  const handlePointerDown = useCallback(
    (event) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = width;

      const handleMove = (moveEvent) => {
        onResize(startWidth + (moveEvent.clientX - startX));
      };
      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [width, onResize],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      onPointerDown={handlePointerDown}
      className="hidden w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-brand-400/40 active:bg-brand-500/60 motion-reduce:transition-none md:block"
    />
  );
}

export default SidebarResizeHandle;
