/** Dismissable dashboard banner — shown when no job-search inbox is connected. */

import { useState } from "react";

import Mail from "lucide-react/dist/esm/icons/mail";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import X from "lucide-react/dist/esm/icons/x";

import InboxSetupDialog from "./InboxSetupDialog";
import { Button } from "./ui/button";
import { useGmailStatus } from "../hooks/useGmailStatus";
import { INBOX_SETUP_BANNER_DISMISSED_KEY } from "../lib/constants";
import { dismissBanner, isBannerDismissed } from "../lib/utils";

const BANNER_FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

function InboxSetupBanner() {
  const { data: status, isLoading } = useGmailStatus();
  const [dismissed, setDismissed] = useState(() =>
    isBannerDismissed(INBOX_SETUP_BANNER_DISMISSED_KEY)
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
    dismissBanner(INBOX_SETUP_BANNER_DISMISSED_KEY);
    setDismissed(true);
  };

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Gmail inbox setup"
        data-testid="inbox-setup-banner"
        className="flex h-9 items-center gap-3 border-b border-border-1 bg-surface-1 px-4 text-xs text-text-1"
      >
        <Mail size={15} aria-hidden="true" className="shrink-0 text-brand-600" />
        <span className="min-w-0 truncate">Connect your job-search inbox to auto-track applications</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="h-6 shrink-0 px-2 text-xs text-brand-700 hover:bg-surface-2 hover:text-brand-800 dark:text-brand-300"
        >
          Set up inbox
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className={`ml-auto inline-flex shrink-0 items-center justify-center rounded text-text-3 hover:bg-surface-2 hover:text-text-1 motion-reduce:transition-none transition-colors duration-hover ease-out ${BANNER_FOCUS_RING}`}
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      <InboxSetupDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

export default InboxSetupBanner;
