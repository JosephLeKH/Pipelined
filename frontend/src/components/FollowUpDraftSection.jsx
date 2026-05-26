/** Follow-up email draft section for stale applications. */

import { useState, useEffect, useRef, useCallback } from "react";

import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";
import Mail from "lucide-react/dist/esm/icons/mail";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import { toast } from "sonner";
import { differenceInDays } from "date-fns/differenceInDays";

import { generateFollowUpDraft } from "../api/applications";
import { getAiToastError } from "../lib/aiConstants";
import AiSection from "./AiSection";
import { Button } from "./ui/button";

function FollowUpDraftSection({ application, autoExpand = false }) {
  const [draft, setDraft] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoGenerateAttempted, setAutoGenerateAttempted] = useState(false);
  const sectionRef = useRef(null);

  const daysSinceUpdate = application.updated_at
    ? differenceInDays(new Date(), new Date(application.updated_at))
    : 0;
  const isStale = daysSinceUpdate >= 14;
  const shouldShow = autoExpand || (isStale && ["Applied", "Phone Screen"].includes(application.current_stage));

  const handleGenerateDraft = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await generateFollowUpDraft(application.id);
      setDraft(result);
      setIsExpanded(true);
    } catch (error) {
      toast.error(getAiToastError(error, "Could not generate draft. Try again."));
    } finally {
      setIsLoading(false);
    }
  }, [application.id]);

  useEffect(() => {
    if (!autoExpand || !shouldShow) return;
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [autoExpand, shouldShow]);

  useEffect(() => {
    if (!autoExpand || !shouldShow || autoGenerateAttempted || draft) return;
    setAutoGenerateAttempted(true);
    handleGenerateDraft();
  }, [autoExpand, shouldShow, autoGenerateAttempted, draft, handleGenerateDraft]);

  if (!shouldShow) return null;

  async function handleCopyDraft() {
    if (!draft) return;
    const fullEmail = `Subject: ${draft.subject}\n\n${draft.body}`;
    try {
      await navigator.clipboard.writeText(fullEmail);
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy");
    }
  }

  return (
    <div ref={sectionRef}>
      <AiSection
        title="Follow-up draft"
        icon={Mail}
        id="follow-up-draft"
        className={autoExpand ? "ring-2 ring-primary/40" : ""}
      >
        {!draft && (
          <p className="text-xs text-muted-foreground">
            {autoExpand
              ? "Generating your follow-up draft…"
              : "Drafts are generated on demand. Nothing is pre-written."}
          </p>
        )}
        {!draft && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateDraft}
            disabled={isLoading}
            className="w-full min-h-[2.75rem] sm:min-h-0 sm:w-auto"
          >
            <Mail className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            {isLoading ? "Generating…" : "Draft follow-up"}
          </Button>
        )}
        {draft && (
          <div className="rounded border border-border bg-card p-3 space-y-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              className="flex items-center justify-between w-full text-left text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <span>Draft email</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
            </button>
            {isExpanded && (
              <div className="flex flex-col gap-2 pt-1 border-t border-border">
                <p className="font-medium text-sm">{draft.subject}</p>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">{draft.body}</pre>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateDraft}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                    {isLoading ? "Regenerating…" : "Regenerate"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyDraft}
                    className="text-xs"
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </AiSection>
    </div>
  );
}

export default FollowUpDraftSection;
