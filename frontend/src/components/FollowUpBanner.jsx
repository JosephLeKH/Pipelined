/** Dismissable dashboard banner shown when follow-up reminders are overdue. */

import { useState } from "react";

import Bell from "lucide-react/dist/esm/icons/bell";
import X from "lucide-react/dist/esm/icons/x";

import { Button } from "./ui/button";

function FollowUpBanner({ followUpsDue, onView }) {
  const [dismissed, setDismissed] = useState(false);

  if (!followUpsDue || followUpsDue <= 0 || dismissed) return null;

  return (
    <div
      className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700/50 dark:bg-amber-900/20"
      role="alert"
      data-testid="follow-up-banner"
    >
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
          You have {followUpsDue} follow-up{followUpsDue !== 1 ? "s" : ""} due
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onView}
          className="text-xs font-medium text-amber-700 hover:bg-amber-100 focus:ring-amber-500 dark:text-amber-400 dark:hover:bg-amber-800/30">
          View
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => setDismissed(true)} aria-label="Dismiss"
          className="h-7 w-7 text-amber-400 hover:bg-amber-100 focus:ring-amber-500 dark:hover:bg-amber-800/30">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default FollowUpBanner;
