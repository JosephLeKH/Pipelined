/** One-time announcement modal — shown after Scout rename ships. */

import { useState } from "react";

import ScoutAvatar from "./scout/ScoutAvatar";
import { Button } from "./ui/button";

const STORAGE_KEY = "scout_announce_v1_dismissed";

function WhatsNewScoutModal() {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(STORAGE_KEY);
  });

  if (!open) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="meet-scout-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="max-w-md rounded-md border border-border-1 bg-surface-0 p-6 shadow-xl">
        <div className="mb-3 flex items-center gap-3">
          <ScoutAvatar size="lg" state="idle" />
          <h2 id="meet-scout-title" className="text-lg font-semibold text-text-1">
            Meet Scout
          </h2>
        </div>
        <p className="mb-4 text-sm text-text-2">
          We named our AI. Scout finds roles, scores them, drafts cover letters, and flags
          ghosting risks — all before you click into an application. Look for Scout's Take
          and Scout's Toolkit at the top of every application.
        </p>
        <div className="flex justify-end">
          <Button onClick={dismiss}>Got it</Button>
        </div>
      </div>
    </div>
  );
}

export default WhatsNewScoutModal;
