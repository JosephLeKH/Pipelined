/** Mobile slide-over sidebar drawer using Radix Dialog. */

import * as DialogPrimitive from "@radix-ui/react-dialog";

import Sidebar from "./Sidebar";
import { cn } from "../../lib/utils";

function MobileSidebar({ open, onOpenChange, onOpenCopilot }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm motion-safe-drawer" />
        <DialogPrimitive.Content
          data-side="left"
          aria-describedby={undefined}
          className={cn(
            "fixed left-0 top-0 z-50 h-full w-60 p-0 outline-none shadow-modal motion-safe-drawer",
            "data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0",
          )}
          onClick={(event) => {
            if (event.target.closest("a,button")) {
              onOpenChange(false);
            }
          }}
        >
          <DialogPrimitive.Title className="sr-only">Navigation menu</DialogPrimitive.Title>
          <Sidebar mobile collapsed={false} onOpenCopilot={onOpenCopilot} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default MobileSidebar;
