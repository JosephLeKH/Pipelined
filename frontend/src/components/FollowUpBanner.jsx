/** Dismissable dashboard banner shown when follow-up reminders are overdue. */

import { useState } from "react";

import Bell from "lucide-react/dist/esm/icons/bell";
import X from "lucide-react/dist/esm/icons/x";

import { Button } from "./ui/button";
import { FOLLOW_UP_BANNER_DISMISSED_KEY } from "../lib/constants";
import { dismissBanner, isBannerDismissed } from "../lib/utils";

const BANNER_FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

function FollowUpBanner({ followUpsDue, onView }) {
  const [dismissed, setDismissed] = useState(() =>
    isBannerDismissed(FOLLOW_UP_BANNER_DISMISSED_KEY)
  );

  if (!followUpsDue || followUpsDue <= 0 || dismissed) return null;

  const handleDismiss = () => {
    dismissBanner(FOLLOW_UP_BANNER_DISMISSED_KEY);
    setDismissed(true);
  };

  const label = `You have ${followUpsDue} follow-up${followUpsDue !== 1 ? "s" : ""} due`;

  return (
    <div
      role="status"
      data-testid="follow-up-banner"
      className="flex h-9 items-center gap-3 border-b border-brand-100 bg-brand-50 px-4 text-xs text-brand-900 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-100"
    >
      <Bell size={14} aria-hidden="true" className="shrink-0 text-brand-700 dark:text-brand-300" />
      <span className="min-w-0 truncate">{label}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onView}
        className="h-6 shrink-0 px-2 text-xs text-brand-700 hover:bg-brand-100 hover:text-brand-800 dark:text-brand-300 dark:hover:bg-brand-800/40"
      >
        View
      </Button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className={`ml-auto inline-flex shrink-0 items-center justify-center rounded text-brand-700 hover:bg-brand-100 hover:text-brand-900 motion-reduce:transition-none transition-colors duration-hover ease-out dark:text-brand-300 dark:hover:bg-brand-800/40 dark:hover:text-brand-100 ${BANNER_FOCUS_RING}`}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

export default FollowUpBanner;
