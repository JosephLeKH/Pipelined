/** Apply pack section: generate cover letter, form answers, LinkedIn note, talking points. */

import { useState } from "react";

import Check from "lucide-react/dist/esm/icons/check";
import Copy from "lucide-react/dist/esm/icons/copy";
import Info from "lucide-react/dist/esm/icons/info";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import { toast } from "sonner";

import { generateApplyPack } from "../api/applications";
import { getAiToastError } from "../lib/aiConstants";
import { COPY_RESET_MS, NO_AUTO_SEND_MESSAGE } from "../lib/constants";
import { SUCCESS_BANNER } from "../lib/designTokens";
import { formatAiFreshness } from "../lib/fitDisplay";
import AiSection from "./AiSection";
import { Button } from "./ui/button";

function CopyFieldButton({ text, label }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), COPY_RESET_MS);
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 text-xs transition-colors ${
        copied
          ? "text-brand-700 font-medium"
          : "text-muted-foreground hover:text-foreground"
      }`}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

const SALUTATION_RE = /^(Dear|Hi|Hello|Greetings|To whom)\b[^,]{0,80},\s+/i;
const PARAGRAPH_CUES = /(?<=[.!?])\s+(?=(?:In my (?:current|recent|previous|prior)\b|I'm (?:particularly )?(?:drawn|impressed|excited)\b|What (?:draws|excites)\b|Thank you\b|Sincerely\b|Best regards\b))/;

function splitCoverLetterParagraphs(text) {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return [];

  const byBlankLine = trimmed.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
  if (byBlankLine.length > 1) return byBlankLine;

  const paragraphs = [];
  let body = trimmed;
  const salutationMatch = body.match(SALUTATION_RE);
  if (salutationMatch) {
    paragraphs.push(salutationMatch[0].replace(/\s+$/, ""));
    body = body.slice(salutationMatch[0].length);
  }
  for (const chunk of body.split(PARAGRAPH_CUES)) {
    const trimmedChunk = chunk.trim();
    if (trimmedChunk) paragraphs.push(trimmedChunk);
  }
  return paragraphs;
}

function CoverLetterContent({ text }) {
  const paragraphs = splitCoverLetterParagraphs(text);
  if (paragraphs.length === 0) return null;
  return (
    <div className="flex flex-col gap-3 font-sans text-sm leading-relaxed text-foreground">
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="whitespace-pre-wrap">{paragraph}</p>
      ))}
    </div>
  );
}

function ApplyPackField({ label, text, children }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border-1 bg-surface-1/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {text ? <CopyFieldButton text={text} label={label} /> : null}
      </div>
      {children}
    </div>
  );
}

function ApplyPackSection({ application, onPackGenerated, bare = false }) {
  const [localPack, setLocalPack] = useState(application.apply_pack ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const hasCached = localPack != null;
  const hasJobDescription = Boolean((application.job_description ?? "").trim());
  const freshness = formatAiFreshness(application.apply_pack_at);

  async function handleGenerate() {
    setIsLoading(true);
    try {
      const result = await generateApplyPack(application.id);
      setLocalPack(result);
      onPackGenerated(result);
    } catch (error) {
      toast.error(getAiToastError(error, "Could not generate apply pack. Try again."));
    } finally {
      setIsLoading(false);
    }
  }

  const talkingPointsText = localPack?.talking_points?.length
    ? localPack.talking_points.map((p, i) => `${i + 1}. ${p}`).join("\n")
    : "";

  return (
    <AiSection title="Apply pack" icon={Sparkles} id="apply-pack" bare={bare}>
      {freshness && (
        <p className="text-xs text-muted-foreground">Generated {freshness}</p>
      )}
      <p className="text-xs text-muted-foreground">Based on your resume, profile, and this job</p>
      <div className={`${SUCCESS_BANNER} flex items-start gap-2 px-3 py-2 text-xs`}>
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
        <p>{NO_AUTO_SEND_MESSAGE}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={isLoading || !hasJobDescription}
        className="w-full min-h-[2.75rem] sm:min-h-0 sm:w-auto"
      >
        {hasCached ? (
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
        )}
        {isLoading ? "Generating…" : hasCached ? "Refresh apply pack" : "Generate apply pack"}
      </Button>
      {!hasJobDescription && (
        <p className="text-xs text-muted-foreground">Add a job description to generate an apply pack.</p>
      )}
      {localPack && (
        <div className="flex flex-col gap-3">
          <ApplyPackField label="Cover letter" text={localPack.cover_letter}>
            <CoverLetterContent text={localPack.cover_letter} />
          </ApplyPackField>
          {localPack.short_answers?.map((item) => (
            <ApplyPackField
              key={item.question}
              label={item.question}
              text={`${item.question}\n\n${item.answer}`}
            >
              <p className="text-xs text-foreground whitespace-pre-wrap">{item.answer}</p>
            </ApplyPackField>
          ))}
          {localPack.linkedin_note && (
            <ApplyPackField label="LinkedIn note" text={localPack.linkedin_note}>
              <p className="text-xs text-foreground">{localPack.linkedin_note}</p>
            </ApplyPackField>
          )}
          {localPack.talking_points?.length > 0 && (
            <ApplyPackField label="Talking points" text={talkingPointsText}>
              <ul className="list-disc pl-4 text-xs text-foreground space-y-0.5">
                {localPack.talking_points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </ApplyPackField>
          )}
        </div>
      )}
    </AiSection>
  );
}

export default ApplyPackSection;
