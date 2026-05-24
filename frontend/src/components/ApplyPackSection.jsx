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
import { COPY_RESET_MS } from "../lib/constants";
import { SUCCESS_BANNER } from "../lib/designTokens";
import AiSection from "./AiSection";
import { Button } from "./ui/button";

const APPLY_PACK_DISCLAIMER = "Copy and paste manually — we never auto-submit applications.";

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

function ApplyPackField({ label, text, children }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border-default bg-surface-secondary/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {text ? <CopyFieldButton text={text} label={label} /> : null}
      </div>
      {children}
    </div>
  );
}

function ApplyPackSection({ application, onPackGenerated }) {
  const [localPack, setLocalPack] = useState(application.apply_pack ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const hasCached = localPack != null;
  const hasJobDescription = Boolean((application.job_description ?? "").trim());

  async function handleGenerate() {
    setIsLoading(true);
    try {
      const result = await generateApplyPack(application.id);
      setLocalPack(result);
      onPackGenerated(result);
    } catch (error) {
      toast.error(getAiToastError(error, "Could not generate apply pack — try again"));
    } finally {
      setIsLoading(false);
    }
  }

  const talkingPointsText = localPack?.talking_points?.length
    ? localPack.talking_points.map((p, i) => `${i + 1}. ${p}`).join("\n")
    : "";

  return (
    <AiSection title="Apply pack" icon={Sparkles} id="apply-pack">
      <div className={`${SUCCESS_BANNER} flex items-start gap-2 px-3 py-2 text-xs`}>
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
        <p>{APPLY_PACK_DISCLAIMER}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={isLoading || !hasJobDescription}
        className="w-full min-h-[44px] sm:min-h-0 sm:w-auto"
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
            <pre className="text-xs text-foreground whitespace-pre-wrap font-sans">{localPack.cover_letter}</pre>
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
