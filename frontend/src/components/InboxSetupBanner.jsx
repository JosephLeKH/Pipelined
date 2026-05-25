/** Dismissable dashboard banner — shown when no job-search inbox is connected. */

import { useState } from "react";

import Mail from "lucide-react/dist/esm/icons/mail";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import X from "lucide-react/dist/esm/icons/x";

import InboxSetupDialog from "./InboxSetupDialog";
import { Button } from "./ui/button";
import { useGmailStatus } from "../hooks/useGmailStatus";
import { INBOX_SETUP_BANNER_DISMISSED_KEY } from "../lib/constants";

const BANNER_FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

function InboxSetupBanner() {
  const { data: status, isLoading } = useGmailStatus();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(INBOX_SETUP_BANNER_DISMISSED_KEY) === "true"
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading || dismissed) return null;

  if (status?.connected) {
    if (status.apps_tracked > 0) {
      return (
        <div className="mb-4 flex items-center gap-1.5 text-xs text-text-3">
          <Sparkles className="h-3 w-3 text-brand-600" aria-hidden="true" />
          Email agent active · {status.apps_tracked} app{status.apps_tracked === 1 ? "" : "s"} tracked
        </div>
      );
    }
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(INBOX_SETUP_BANNER_DISMISSED_KEY, "true");
    setDismissed(true);
  };

  return (
    <>
      <div
        className="mb-4 flex items-center justify-between rounded-lg border border-border-1 bg-surface-1 p-4"
        role="alert"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Gmail inbox setup"
        data-testid="inbox-setup-banner"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <span className="text-sm font-medium text-text-1">
            Connect your job-search inbox to auto-track applications
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="text-xs font-medium text-brand-700 hover:bg-surface-2 hover:text-brand-800 dark:text-brand-300"
          >
            Set up inbox
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
      <InboxSetupDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

export default InboxSetupBanner;
