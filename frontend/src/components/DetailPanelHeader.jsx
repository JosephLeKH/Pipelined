/** Panel header: company logo, role title, company name, AI status strip, actions. */

import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import X from "lucide-react/dist/esm/icons/x";
import Mail from "lucide-react/dist/esm/icons/mail";
import BookOpen from "lucide-react/dist/esm/icons/book-open";

import { getDisplayFitScore } from "../lib/fitDisplay";
import { BADGE_DEFAULT, BADGE_INFO, BADGE_SUCCESS } from "../lib/designTokens";
import CompanyLogo from "./CompanyLogo";
import FitBadge from "./FitBadge";
import { Button } from "./ui/button";

function HeaderStatusPill({ children, className = BADGE_DEFAULT }) {
  return (
    <span className={`${className} shrink-0 whitespace-nowrap`}>
      {children}
    </span>
  );
}

function DetailPanelAiStrip({ application }) {
  const fitScore = getDisplayFitScore(application);
  const hasPrep = Boolean(application.interview_prep_briefing);
  const isGmailSynced = application.source === "email";

  if (fitScore == null && !hasPrep && !isGmailSynced) {
    return null;
  }

  return (
    <div
      className="flex min-h-[1.25rem] flex-wrap items-center gap-1.5"
      aria-label="AI status"
    >
      {fitScore != null && <FitBadge score={fitScore} />}
      {hasPrep && (
        <HeaderStatusPill className={BADGE_SUCCESS}>
          <BookOpen className="h-3 w-3" aria-hidden="true" />
          Prep ready
        </HeaderStatusPill>
      )}
      {isGmailSynced && (
        <HeaderStatusPill className={BADGE_INFO}>
          <Mail className="h-3 w-3" aria-hidden="true" />
          Gmail synced
        </HeaderStatusPill>
      )}
    </div>
  );
}

export function DetailPanelHeader({ application, onClose, onDelete }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <CompanyLogo company_domain={application.company_domain ?? null} company={application.company ?? ""} size={32} />
        <div className="min-w-0">
          <h2 id="detail-panel-heading" className="truncate text-lg font-semibold font-display text-foreground">
            {application.role_title}
          </h2>
          <p className="truncate text-sm text-muted-foreground">{application.company}</p>
          <div className="mt-1.5">
            <DetailPanelAiStrip application={application} />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close panel"
          className="bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onDelete} aria-label="Delete application"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
