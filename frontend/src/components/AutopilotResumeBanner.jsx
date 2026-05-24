/** Dashboard banner prompting resume upload for autopilot. */

import { Link } from "react-router-dom";

import FileText from "lucide-react/dist/esm/icons/file-text";

import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";

function AutopilotResumeBanner() {
  const { user } = useAuth();

  if (user?.has_resume) return null;

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3"
      role="alert"
      aria-live="polite"
      data-testid="autopilot-resume-banner"
    >
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-medium text-foreground">
          Upload a resume to enable autopilot job matching
        </span>
      </div>
      <Button type="button" variant="ghost" size="sm" asChild>
        <Link to="/settings?section=resume" className="text-xs font-medium text-primary">
          Upload resume
        </Link>
      </Button>
    </div>
  );
}

export default AutopilotResumeBanner;
