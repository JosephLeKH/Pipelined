/** Dismissable dashboard banner — shown when no job-search inbox is connected. */

import { useState } from "react";

import Mail from "lucide-react/dist/esm/icons/mail";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import X from "lucide-react/dist/esm/icons/x";

import InboxSetupDialog from "./InboxSetupDialog";
import { Button } from "./ui/button";
import { useGmailStatus } from "../hooks/useGmailStatus";

const BANNER_DISMISSED_KEY = "pipelined_gmail_banner_dismissed";

function InboxSetupBanner() {
  const { data: status, isLoading } = useGmailStatus();
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(BANNER_DISMISSED_KEY));
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading || dismissed) return null;

  // Show agent-active chip when connected with tracked apps
  if (status?.connected) {
    if (status.apps_tracked > 0) {
      return (
        <div className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
          Email agent active · {status.apps_tracked} app{status.apps_tracked === 1 ? "" : "s"} tracked
        </div>
      );
    }
    return null;
  }

  return (
    <>
      <div
        className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3"
        role="alert"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Gmail inbox setup"
        data-testid="inbox-setup-banner"
      >
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground">
            Connect your job-search inbox to auto-track applications
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="text-xs font-medium text-primary hover:bg-primary/10"
          >
            Set up inbox
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              localStorage.setItem(BANNER_DISMISSED_KEY, "1");
              setDismissed(true);
            }}
            aria-label="Dismiss"
            className="h-7 w-7 text-muted-foreground hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <InboxSetupDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

export default InboxSetupBanner;
