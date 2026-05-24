/** Follow-up email draft section for stale applications. */

import { useState, useEffect, useRef } from "react";

import Mail from "lucide-react/dist/esm/icons/mail";
import { toast } from "sonner";
import { differenceInDays } from "date-fns/differenceInDays";

import { generateFollowUpDraft } from "../api/applications";
import { Button } from "./ui/button";

function FollowUpDraftSection({ application, autoExpand = false }) {
  const [draft, setDraft] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const sectionRef = useRef(null);

  const daysSinceUpdate = application.updated_at
    ? differenceInDays(new Date(), new Date(application.updated_at))
    : 0;
  const isStale = daysSinceUpdate >= 14;
  const shouldShow = autoExpand || (isStale && ["Applied", "Phone Screen"].includes(application.current_stage));

  useEffect(() => {
    if (!autoExpand || !shouldShow) return;
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [autoExpand, shouldShow]);

  if (!shouldShow) return null;

  async function handleGenerateDraft() {
    setIsLoading(true);
    try {
      const result = await generateFollowUpDraft(application.id);
      setDraft(result);
      setIsExpanded(true);
    } catch (error) {
      toast.error("Could not generate draft — try again");
    } finally {
      setIsLoading(false);
    }
  }

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
    <div ref={sectionRef} className={`flex flex-col gap-1.5${autoExpand ? " rounded-md ring-2 ring-primary/40 p-2 -mx-2" : ""}`}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerateDraft}
        disabled={isLoading}
        className="w-full sm:w-auto"
      >
        <Mail className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
        {isLoading ? "Generating..." : "Draft follow-up"}
      </Button>
      {draft && (
        <div className="rounded border border-border bg-card p-3 space-y-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            <span>Draft Email</span>
            <span className="text-xs text-muted-foreground">{isExpanded ? "▼" : "▶"}</span>
          </button>
          {isExpanded && (
            <div className="flex flex-col gap-2 pt-1 border-t border-border">
              <p className="font-medium text-sm">{draft.subject}</p>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">{draft.body}</pre>
              <div className="flex justify-end">
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
    </div>
  );
}

export default FollowUpDraftSection;
