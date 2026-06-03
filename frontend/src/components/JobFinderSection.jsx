/** Job Finder agent — searches the web for the listing URL and scrapes a JD preview.
 *  Preview-then-save flow: user reviews the result before it persists. */

import { useState } from "react";

import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Search from "lucide-react/dist/esm/icons/search";
import { toast } from "sonner";

import { findJobDescription } from "../api/applications";
import { getAiToastError } from "../lib/aiConstants";
import AiSection from "./AiSection";
import { Button } from "./ui/button";

const CONFIDENCE_LABEL = {
  high: { label: "High confidence", className: "bg-emerald-50 text-emerald-700" },
  medium: { label: "Medium confidence", className: "bg-amber-50 text-amber-700" },
  low: { label: "Low confidence", className: "bg-red-50 text-red-700" },
};

const PREVIEW_TRUNCATE_CHARS = 600;

function ConfidencePill({ confidence }) {
  const meta = CONFIDENCE_LABEL[confidence] ?? CONFIDENCE_LABEL.low;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.625rem] font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function PreviewCard({ result }) {
  const truncated = result.job_description && result.job_description.length > PREVIEW_TRUNCATE_CHARS
    ? `${result.job_description.slice(0, PREVIEW_TRUNCATE_CHARS)}…`
    : result.job_description;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border-1 bg-surface-1 p-3">
      <div className="flex items-center justify-between gap-2">
        <ConfidencePill confidence={result.company_match_confidence} />
        {result.source_url && (
          <a
            href={result.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            Open listing
          </a>
        )}
      </div>
      {result.source_url && (
        <p className="break-all text-xs text-text-3">{result.source_url}</p>
      )}
      {truncated ? (
        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded border border-border-1 bg-surface-0 p-2 font-sans text-xs text-text-1">
          {truncated}
        </pre>
      ) : (
        <p className="text-xs text-text-3">
          {result.is_valid_job_page === false
            ? "Page didn't look like a job listing. Try again or paste the URL manually."
            : "Couldn't extract a job description from the page."}
        </p>
      )}
    </div>
  );
}

function JobFinderSection({ application, onUpdate, bare = false }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleFind() {
    setIsLoading(true);
    try {
      const data = await findJobDescription(application.id);
      setResult(data);
    } catch (error) {
      toast.error(getAiToastError(error, "Could not find the job listing. Try again."));
    } finally {
      setIsLoading(false);
    }
  }

  function handleSave() {
    if (!result) return;
    const patch = {};
    if (result.source_url) patch.source_url = result.source_url;
    if (result.job_description) patch.job_description = result.job_description;
    if (Object.keys(patch).length === 0) {
      toast.error("Nothing to save.");
      return;
    }
    onUpdate(patch);
    toast.success("Saved to application.");
    setResult(null);
  }

  function handleDiscard() {
    setResult(null);
  }

  const cta = result ? "Try again" : application.source_url ? "Re-scrape JD" : "Find job description";

  return (
    <AiSection title="Job Finder" icon={Search} id="job-finder" bare={bare}>
      <p className="text-xs text-muted-foreground">
        Searches the web for the listing URL and extracts the job description. Nothing is saved
        until you confirm.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleFind}
          disabled={isLoading}
          className="min-h-[2.75rem] sm:min-h-0"
        >
          {result ? (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          ) : (
            <Search className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          )}
          {isLoading ? "Searching…" : cta}
        </Button>
      </div>
      {result && <PreviewCard result={result} />}
      {result && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleDiscard}>
            Discard
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!result.source_url && !result.job_description}
          >
            Save to application
          </Button>
        </div>
      )}
    </AiSection>
  );
}

export default JobFinderSection;
