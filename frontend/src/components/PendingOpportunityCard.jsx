/** Card for a single autopilot pending opportunity with approve/reject actions. */

import { useState } from "react";

import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Check from "lucide-react/dist/esm/icons/check";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";
import Copy from "lucide-react/dist/esm/icons/copy";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import { toast } from "sonner";

import { COPY_RESET_MS } from "../lib/constants";
import { formatSavedAgo } from "../lib/dateUtils";
import { BUTTON_SECONDARY } from "../lib/designTokens";
import FitBadge from "./FitBadge";
import { Button } from "./ui/button";

const CARD_CLASS =
  "rounded-lg border border-border-1 bg-surface-0 p-4 dark:bg-surface-0 dark:border-border-1";
const RESUME_TIPS_DISCLAIMER = "Suggestions only — review and edit before applying.";
const APPLY_PACK_HINT = "After approving, open Apply pack in the application detail to copy materials.";
const MATCH_REASON_MAX = 120;

function sourceLabel(source) {
  return source === "watchlist" ? "Watchlist" : "Autopilot";
}

function formatCreatedAgo(createdAt) {
  if (!createdAt) return "";
  return formatSavedAgo(new Date(createdAt));
}

function truncateQuote(text) {
  if (!text || text.length <= MATCH_REASON_MAX) return text;
  return `${text.slice(0, MATCH_REASON_MAX).trim()}…`;
}

function CollapsibleSection({ label, expandedLabel, isExpanded, onToggle, children }) {
  return (
    <div className="border-t border-border-1 pt-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between text-left text-sm font-medium text-text-1 transition-colors hover:text-brand-600 motion-reduce:transition-none"
      >
        <span>{isExpanded ? expandedLabel : label}</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-text-3" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-text-3" aria-hidden="true" />
        )}
      </button>
      {isExpanded && <div className="mt-3">{children}</div>}
    </div>
  );
}

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
    <CollapsibleSection
      label="View AI-drafted cover letter"
      expandedLabel="View AI-drafted cover letter"
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded((prev) => !prev)}
    >
      <div className="flex flex-col gap-2 rounded-md border border-border-1 bg-surface-1/50 p-3">
        {coverLetter.subject && (
          <p className="text-sm font-medium text-text-2">Subject: {coverLetter.subject}</p>
        )}
        <p className="whitespace-pre-wrap text-sm text-text-1">{coverLetter.body}</p>
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
    </CollapsibleSection>
  );
}

function ResumeTipsSection({ resumeTips }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!resumeTips?.summary) return null;

  return (
    <CollapsibleSection
      label="View resume tips"
      expandedLabel="View resume tips"
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded((prev) => !prev)}
    >
      <div className="flex flex-col gap-2">
        <p className="text-sm text-text-1">{resumeTips.summary}</p>
        {resumeTips.bullet_suggestions?.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-text-1">
            {resumeTips.bullet_suggestions.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        )}
        <p className="text-xs text-text-3">{RESUME_TIPS_DISCLAIMER}</p>
      </div>
    </CollapsibleSection>
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
  const timeAgo = formatCreatedAgo(opportunity.created_at);
  const quote = truncateQuote(opportunity.match_reason);

  return (
    <article aria-label={`${company} — ${role}`} className={CARD_CLASS}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-brand-600"
              aria-hidden="true"
            />
            <span className="font-semibold text-text-1">{company}</span>
            <span className="text-sm text-text-2">{role}</span>
            {opportunity.source === "watchlist" && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-2">
                Watchlist
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-text-3">
            <FitBadge score={opportunity.match_score} />
            <span aria-hidden="true">·</span>
            <span>Suggested by {sourceLabel(opportunity.source)}</span>
            {timeAgo && (
              <>
                <span aria-hidden="true">·</span>
                <span>{timeAgo}</span>
              </>
            )}
            {opportunity.match_reason && (
              <button
                type="button"
                onClick={() => setShowWhy((prev) => !prev)}
                aria-expanded={showWhy}
                className="text-brand-600 hover:underline dark:text-brand-400"
              >
                Why?
              </button>
            )}
          </div>
          {showWhy && opportunity.match_reason && (
            <p className="mt-2 text-sm text-text-1">{opportunity.match_reason}</p>
          )}
        </div>
      </header>

      {quote && !showWhy && (
        <p className="mt-3 text-sm text-text-2">&ldquo;{quote}&rdquo;</p>
      )}

      <div className="mt-3 space-y-0">
        <CoverLetterSection coverLetter={opportunity.cover_letter} />
        <ResumeTipsSection resumeTips={opportunity.resume_tips} />

        {opportunity.talking_points?.length > 0 && (
          <div className="border-t border-border-1 pt-3">
            <h3 className="text-sm font-medium text-text-1">Talking points</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-1">
              {opportunity.talking_points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-text-3">{APPLY_PACK_HINT}</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => onApprove(opportunity.id)}
          disabled={isBusy}
          aria-label={`Approve ${company} — ${role}`}
        >
          {isApproving ? (
            "Adding…"
          ) : (
            <>
              Approve
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(opportunity.id)}
          disabled={isBusy}
          aria-label={`Reject ${company} — ${role}`}
        >
          {isDismissing ? "Rejecting…" : "Reject"}
        </Button>
        {applyUrl && (
          <Button variant="link" size="sm" asChild className="h-7 px-2">
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open job for ${company} — ${role}`}
            >
              Open job
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </Button>
        )}
      </div>
    </article>
  );
}

export default PendingOpportunityCard;
