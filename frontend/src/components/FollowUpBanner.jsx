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
      className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3"
      role="alert"
      data-testid="follow-up-banner"
    >
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          You have {followUpsDue} follow-up{followUpsDue !== 1 ? "s" : ""} due
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onView}
          className="text-xs font-medium text-muted-foreground hover:bg-muted">
          View
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => setDismissed(true)} aria-label="Dismiss"
          className="h-7 w-7 text-muted-foreground hover:bg-muted">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default FollowUpBanner;
