/** Dashboard banner prompting resume upload for autopilot. */

import { useState } from "react";
import { Link } from "react-router-dom";

import FileText from "lucide-react/dist/esm/icons/file-text";
import X from "lucide-react/dist/esm/icons/x";

import { useAuth } from "../context/AuthContext";
import { AUTOPILOT_RESUME_BANNER_DISMISSED_KEY } from "../lib/constants";
import { dismissBanner, isBannerDismissed } from "../lib/utils";
import { Button } from "./ui/button";

const BANNER_FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

function AutopilotResumeBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() =>
    isBannerDismissed(AUTOPILOT_RESUME_BANNER_DISMISSED_KEY)
  );

  if (user?.has_resume || dismissed) return null;

  const handleDismiss = () => {
    dismissBanner(AUTOPILOT_RESUME_BANNER_DISMISSED_KEY);
    setDismissed(true);
  };

  return (
    <div
      role="status"
      data-testid="autopilot-resume-banner"
      className="flex h-9 items-center gap-3 border-b border-border-1 bg-surface-1 px-4 text-xs text-text-1"
    >
      <FileText size={15} aria-hidden="true" className="shrink-0 text-brand-600" />
      <span className="min-w-0 truncate">Upload a resume to enable autopilot job matching</span>
      <Button type="button" variant="ghost" size="sm" asChild className="h-6 shrink-0 px-2 text-xs">
        <Link
          to="/settings?section=resume"
          className="text-brand-700 hover:bg-surface-2 hover:text-brand-800 dark:text-brand-300"
        >
          Upload resume
        </Link>
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
  );
}

export default AutopilotResumeBanner;
