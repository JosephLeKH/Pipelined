/** Card for a single autopilot pending opportunity with approve/dismiss actions. */

import { useState } from "react";

import Check from "lucide-react/dist/esm/icons/check";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";
import Copy from "lucide-react/dist/esm/icons/copy";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import { toast } from "sonner";

import { FIT_SCORE_LABEL } from "../lib/aiConstants";
import { COPY_RESET_MS } from "../lib/constants";
import { BUTTON_SECONDARY, CARD_BASE } from "../lib/designTokens";
import FitBadge from "./FitBadge";
import { Button } from "./ui/button";

const RESUME_TIPS_DISCLAIMER = "Suggestions only — review and edit before applying.";
const APPLY_PACK_HINT = "After approving, open Apply pack in the application detail to copy materials.";

function CoverLetterSection({ coverLetter }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!coverLetter?.body) return null;

  const fullText = coverLetter.subject
    ? `Subject: ${coverLetter.subject}\n\n${coverLetter.body}`
    : coverLetter.body;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), COPY_RESET_MS);
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <div className="rounded-lg border border-border-default bg-surface-secondary/50 p-3">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground transition-colors hover:text-brand-600"
      >
        <span>Cover letter draft</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </button>
      {isExpanded && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border-default pt-3">
          {coverLetter.subject && (
            <p className="text-sm font-medium text-muted-foreground">
              Subject: {coverLetter.subject}
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm text-foreground">{coverLetter.body}</p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className={`${BUTTON_SECONDARY} inline-flex items-center gap-1.5 px-3 py-1.5 text-xs`}
              aria-label={copied ? "Cover letter copied" : "Copy cover letter"}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PendingOpportunityCard({
  opportunity,
  onApprove,
  onDismiss,
  isApproving,
  isDismissing,
}) {
  const [showWhy, setShowWhy] = useState(false);
  const company = opportunity.listing_company ?? "Unknown company";
  const role = opportunity.listing_role ?? "Role";
  const applyUrl = opportunity.listing_apply_url;
  const isBusy = isApproving || isDismissing;

  return (
    <article
      aria-label={`${company} — ${role}`}
      className={`${CARD_BASE} p-5`}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {company} — {role}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{FIT_SCORE_LABEL}</span>
            <FitBadge score={opportunity.match_score} />
            {opportunity.match_reason && (
              <button
                type="button"
                onClick={() => setShowWhy((prev) => !prev)}
                aria-expanded={showWhy}
                className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                Why?
              </button>
            )}
          </div>
          {showWhy && opportunity.match_reason && (
            <p className="text-sm text-foreground">{opportunity.match_reason}</p>
          )}
        </div>
        {applyUrl && (
          <a
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            View job
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </header>

      <div className="mb-4 space-y-3">
        <CoverLetterSection coverLetter={opportunity.cover_letter} />

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

        {opportunity.talking_points?.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-foreground">Talking points</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
              {opportunity.talking_points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">{APPLY_PACK_HINT}</p>
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
