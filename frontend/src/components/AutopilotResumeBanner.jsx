/** Dashboard banner prompting resume upload for autopilot. */

import { useState } from "react";
import { Link } from "react-router-dom";

import FileText from "lucide-react/dist/esm/icons/file-text";
import X from "lucide-react/dist/esm/icons/x";

import { useAuth } from "../context/AuthContext";
import { AUTOPILOT_RESUME_BANNER_DISMISSED_KEY } from "../lib/constants";
import { Button } from "./ui/button";

const BANNER_FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

function AutopilotResumeBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(AUTOPILOT_RESUME_BANNER_DISMISSED_KEY) === "true"
  );

  if (user?.has_resume || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(AUTOPILOT_RESUME_BANNER_DISMISSED_KEY, "true");
    setDismissed(true);
  };

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-1 bg-surface-1 p-4"
      role="alert"
      aria-live="polite"
      data-testid="autopilot-resume-banner"
    >
      <div className="flex min-w-0 items-center gap-2">
        <FileText className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
        <span className="text-sm font-medium text-text-1">
          Upload a resume to enable autopilot job matching
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" variant="ghost" size="sm" asChild>
          <Link
            to="/settings?section=resume"
            className="text-xs font-medium text-brand-700 hover:bg-surface-2 hover:text-brand-800 dark:text-brand-300"
          >
            Upload resume
          </Link>
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

export default AutopilotResumeBanner;
