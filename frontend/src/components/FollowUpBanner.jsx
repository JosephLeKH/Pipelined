/** Dismissable dashboard banner shown when follow-up reminders are overdue. */

import { useState } from "react";

import X from "lucide-react/dist/esm/icons/x";

import { Button } from "./ui/button";
import { FOLLOW_UP_BANNER_DISMISSED_KEY } from "../lib/constants";

const BANNER_FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

function FollowUpBanner({ followUpsDue, onView }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(FOLLOW_UP_BANNER_DISMISSED_KEY) === "true"
  );

  if (!followUpsDue || followUpsDue <= 0 || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(FOLLOW_UP_BANNER_DISMISSED_KEY, "true");
    setDismissed(true);
  };

  return (
    <div
      className="mb-4 flex items-center justify-between rounded-lg border border-border-1 bg-surface-1 p-4"
      role="alert"
      data-testid="follow-up-banner"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
        <span className="text-sm font-medium text-text-1">
          You have {followUpsDue} follow-up{followUpsDue !== 1 ? "s" : ""} due
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onView}
          className="text-xs font-medium text-brand-700 hover:bg-surface-2 hover:text-brand-800 dark:text-brand-300"
        >
          View
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className={`inline-flex h-4 w-4 items-center justify-center rounded text-text-3 hover:bg-surface-2 hover:text-text-1 motion-reduce:transition-none transition-colors duration-hover ease-out ${BANNER_FOCUS_RING}`}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default FollowUpBanner;
