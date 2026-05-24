/** Card for a single autopilot pending opportunity with approve/dismiss actions. */

import ExternalLink from "lucide-react/dist/esm/icons/external-link";

import { formatFitScore } from "../lib/aiConstants";
import { Button } from "./ui/button";

const RESUME_TIPS_DISCLAIMER = "Suggestions only — review and edit before applying.";

function PendingOpportunityCard({
  opportunity,
  onApprove,
  onDismiss,
  isApproving,
  isDismissing,
}) {
  const company = opportunity.listing_company ?? "Unknown company";
  const role = opportunity.listing_role ?? "Role";
  const applyUrl = opportunity.listing_apply_url;
  const isBusy = isApproving || isDismissing;

  return (
    <article
      aria-label={`${company} — ${role}`}
      className="rounded-xl border border-border bg-card p-5 shadow-card"
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            {company} — {role}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatFitScore(opportunity.match_score)}
          </p>
          {opportunity.match_reason && (
            <p className="mt-1 text-sm text-foreground">{opportunity.match_reason}</p>
          )}
        </div>
        {applyUrl && (
          <a
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View job
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </header>

      <div className="mb-4 space-y-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">Cover letter draft</h3>
          {opportunity.cover_letter?.subject && (
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Subject: {opportunity.cover_letter.subject}
            </p>
          )}
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
            {opportunity.cover_letter?.body}
          </p>
        </div>

        {opportunity.resume_tips?.summary && (
          <div>
            <h3 className="text-sm font-medium text-foreground">Resume tips</h3>
            <p className="mt-1 text-sm text-foreground">{opportunity.resume_tips.summary}</p>
            {opportunity.resume_tips.bullet_suggestions?.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
                {opportunity.resume_tips.bullet_suggestions.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted-foreground">{RESUME_TIPS_DISCLAIMER}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => onApprove(opportunity.id)}
          disabled={isBusy}
          aria-label={`Approve ${company} — ${role}`}
        >
          {isApproving ? "Adding…" : "Approve"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onDismiss(opportunity.id)}
          disabled={isBusy}
          aria-label={`Dismiss ${company} — ${role}`}
        >
          {isDismissing ? "Dismissing…" : "Dismiss"}
        </Button>
      </div>
    </article>
  );
}

export default PendingOpportunityCard;
