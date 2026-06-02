/** Recruiter thread summary with reply option chips. */

import { useState } from "react";

import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import { toast } from "sonner";

import { generateThreadSummary } from "../api/applications";
import { getAiToastError } from "../lib/aiConstants";
import { useEmailEvents } from "../hooks/useApplications";
import AiSection from "./AiSection";
import { Button } from "./ui/button";

function ThreadSummarySection({ application, onSummaryGenerated, bare = false }) {
  const [localSummary, setLocalSummary] = useState(application.thread_summary ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const { data: emailEvents = [], isLoading: eventsLoading } = useEmailEvents(application.id);

  const hasCached = localSummary != null;
  const hasEmailEvents = emailEvents.length > 0;

  if (!bare && (eventsLoading || !hasEmailEvents)) {
    return null;
  }

  async function handleGenerate() {
    setIsLoading(true);
    try {
      const result = await generateThreadSummary(application.id);
      setLocalSummary(result);
      onSummaryGenerated?.(result);
    } catch (error) {
      toast.error(getAiToastError(error, "Could not generate summary. Try again."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopySummary() {
    if (!localSummary?.summary) return;
    try {
      await navigator.clipboard.writeText(localSummary.summary);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }

  async function handleCopyReplyOption(option) {
    try {
      await navigator.clipboard.writeText(option);
      toast.success("Reply angle copied");
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <AiSection title="Thread summary" icon={MessageSquare} id="thread-summary" bare={bare}>
      <p className="text-xs text-muted-foreground">
        Summarized from email metadata only. Nothing is sent automatically.
      </p>
      {!hasEmailEvents && !eventsLoading && (
        <p className="text-xs text-muted-foreground">
          No emails synced yet for this application. Connect Gmail in Settings or wait for a recruiter reply.
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={isLoading || !hasEmailEvents}
        className="w-full min-h-[2.75rem] sm:min-h-0 sm:w-auto"
      >
        {hasCached ? (
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
        ) : (
          <MessageSquare className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
        )}
        {isLoading ? "Summarizing…" : hasCached ? "Refresh summary" : "Summarize thread"}
      </Button>
      {localSummary && (
        <div className="flex flex-col gap-3 rounded border border-border bg-card p-3">
          {localSummary.summary ? (
            <p className="text-sm text-foreground" data-testid="thread-summary-text">
              {localSummary.summary}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopySummary}
              className="text-xs"
            >
              Copy summary
            </Button>
          </div>
          {localSummary.reply_options?.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">Reply angles</span>
              <div className="flex flex-wrap gap-2" data-testid="reply-option-chips">
                {localSummary.reply_options.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyReplyOption(option)}
                    className="text-xs rounded-full"
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </AiSection>
  );
}

export default ThreadSummarySection;
