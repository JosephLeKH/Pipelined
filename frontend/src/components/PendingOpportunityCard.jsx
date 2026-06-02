/** Card for a single autopilot pending opportunity with approve/reject actions. */

import { useState } from "react";

import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Check from "lucide-react/dist/esm/icons/check";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import Copy from "lucide-react/dist/esm/icons/copy";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import FileText from "lucide-react/dist/esm/icons/file-text";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import { toast } from "sonner";

import { COPY_RESET_MS } from "../lib/constants";
import { formatSavedAgo } from "../lib/dateUtils";
import { BUTTON_SECONDARY } from "../lib/designTokens";
import FitBadge from "./FitBadge";
import { Button } from "./ui/button";

const CARD_CLASS =
  "rounded-lg border border-border-1 bg-surface-0 p-4 dark:bg-surface-0 dark:border-border-1";
const RESUME_TIPS_DISCLAIMER = "Suggestions only. Review and edit before applying.";
const MAX_TALKING_POINTS = 3;

function sourceLabel(source) {
  return source === "watchlist" ? "Watchlist" : "Autopilot";
}

function formatCreatedAgo(createdAt) {
  if (!createdAt) return "";
  return formatSavedAgo(new Date(createdAt));
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), COPY_RESET_MS);
    } catch (error) {
      console.warn("Copy failed:", error);
      toast.error("Failed to copy");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`${BUTTON_SECONDARY} inline-flex items-center gap-1.5 px-3 py-1.5 text-xs`}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CoverLetterPanel({ coverLetter }) {
  const fullText = coverLetter.subject
    ? `Subject: ${coverLetter.subject}\n\n${coverLetter.body}`
    : coverLetter.body;

  return (
    <div className="rounded-md border border-border-1 bg-surface-1/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-text-3">
          Cover letter draft
        </p>
        <CopyButton text={fullText} label="cover letter" />
      </div>
      {coverLetter.subject && (
        <p className="mt-2 text-sm font-medium text-text-2">Subject: {coverLetter.subject}</p>
      )}
      <p className="mt-1 whitespace-pre-wrap text-sm text-text-1">{coverLetter.body}</p>
    </div>
  );
}

function ResumeTipsPanel({ resumeTips }) {
  return (
    <div className="rounded-md border border-border-1 bg-surface-1/50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-3">Resume tips</p>
      <p className="mt-2 text-sm text-text-1">{resumeTips.summary}</p>
      {resumeTips.bullet_suggestions?.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-1">
          {resumeTips.bullet_suggestions.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-text-3">{RESUME_TIPS_DISCLAIMER}</p>
    </div>
  );
}

function SecondaryToggle({ id, label, icon: Icon, isOpen, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls={id}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors motion-reduce:transition-none ${
        isOpen
          ? "border-border-2 bg-surface-2 text-text-1"
          : "border-border-1 text-text-2 hover:bg-surface-1 hover:text-text-1"
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{label}</span>
      <ChevronDown
        className={`h-3 w-3 text-text-3 transition-transform motion-reduce:transition-none ${
          isOpen ? "rotate-180" : ""
        }`}
        aria-hidden="true"
      />
    </button>
  );
}

function PendingOpportunityCard({
  opportunity,
  onApprove,
  onDismiss,
  isApproving,
  isDismissing,
}) {
  const [openPanel, setOpenPanel] = useState(null);
  const company = opportunity.listing_company ?? "Unknown company";
  const role = opportunity.listing_role ?? "Role";
  const applyUrl = opportunity.listing_apply_url;
  const isBusy = isApproving || isDismissing;
  const timeAgo = formatCreatedAgo(opportunity.created_at);
  const matchReason = opportunity.match_reason;
  const talkingPoints = (opportunity.talking_points ?? []).slice(0, MAX_TALKING_POINTS);
  const hasCoverLetter = Boolean(opportunity.cover_letter?.body);
  const hasResumeTips = Boolean(opportunity.resume_tips?.summary);

  const togglePanel = (panel) =>
    setOpenPanel((current) => (current === panel ? null : panel));

  return (
    <article aria-label={`${company} · ${role}`} className={CARD_CLASS}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-brand-600"
              aria-hidden="true"
            />
            <span className="text-sm text-text-3">Scout found:</span>
            <span className="font-semibold text-text-1">{company}</span>
            <span aria-hidden="true" className="text-sm text-text-3">·</span>
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
          </div>
        </div>
      </header>

      {matchReason && (
        <p className="mt-3 text-sm leading-snug text-text-1">{matchReason}</p>
      )}

      {talkingPoints.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm text-text-1">
          {talkingPoints.map((point) => (
            <li key={point} className="flex gap-2">
              <span
                className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-text-3"
                aria-hidden="true"
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}

      {(hasCoverLetter || hasResumeTips) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {hasCoverLetter && (
            <SecondaryToggle
              id="cover-letter-panel"
              label="Cover letter"
              icon={FileText}
              isOpen={openPanel === "cover"}
              onToggle={() => togglePanel("cover")}
            />
          )}
          {hasResumeTips && (
            <SecondaryToggle
              id="resume-tips-panel"
              label="Resume tips"
              icon={Sparkles}
              isOpen={openPanel === "resume"}
              onToggle={() => togglePanel("resume")}
            />
          )}
        </div>
      )}

      {openPanel === "cover" && hasCoverLetter && (
        <div id="cover-letter-panel" className="mt-2">
          <CoverLetterPanel coverLetter={opportunity.cover_letter} />
        </div>
      )}
      {openPanel === "resume" && hasResumeTips && (
        <div id="resume-tips-panel" className="mt-2">
          <ResumeTipsPanel resumeTips={opportunity.resume_tips} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => onApprove(opportunity.id)}
          disabled={isBusy}
          aria-label={`Add to pipeline as 'To Apply' (Scout drafts the cover letter).`}
        >
          {isApproving ? (
            "Adding…"
          ) : (
            <>
              Add to pipeline
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
          aria-label={`Reject ${company} · ${role}`}
        >
          {isDismissing ? "Rejecting…" : "Reject"}
        </Button>
        {applyUrl && (
          <Button variant="link" size="sm" asChild className="ml-auto h-7 px-2">
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open job for ${company} · ${role}`}
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
