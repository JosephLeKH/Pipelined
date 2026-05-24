/** Resume insights section: JD paste, analyze, and cached suggestions display. */

import { useState } from "react";

import Info from "lucide-react/dist/esm/icons/info";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import { toast } from "sonner";

import { generateResumeInsights } from "../api/applications";
import { JOB_DESCRIPTION_MAX_LENGTH } from "../lib/constants";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

function ResumeInsightsSection({ application, onUpdate, onInsightsGenerated }) {
  const [localInsights, setLocalInsights] = useState(application.resume_insights ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const jdValue = application.job_description ?? "";
  const hasCached = localInsights != null;

  async function handleAnalyze() {
    setIsLoading(true);
    try {
      const result = await generateResumeInsights(application.id);
      setLocalInsights(result);
      onInsightsGenerated(result);
    } catch (error) {
      toast.error("Could not generate insights — try again");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-medium uppercase text-muted-foreground">Resume Insights</span>
      <div className="flex items-start gap-2 rounded border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
        <p>Suggestions only — we never edit your resume file.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="job-description">
          Job Description
        </label>
        <Textarea
          id="job-description"
          value={jdValue}
          onChange={(e) => onUpdate({ job_description: e.target.value || null })}
          maxLength={JOB_DESCRIPTION_MAX_LENGTH}
          rows={4}
          placeholder="Paste the job description here…"
          className="text-sm"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAnalyze}
        disabled={isLoading || !jdValue.trim()}
        className="w-full sm:w-auto"
      >
        {hasCached ? (
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
        )}
        {isLoading ? "Analyzing…" : hasCached ? "Refresh insights" : "Analyze resume"}
      </Button>
      {localInsights && (
        <div className="flex flex-col gap-3 rounded border border-border bg-card p-3">
          {localInsights.overall_summary && (
            <p className="text-sm text-foreground">{localInsights.overall_summary}</p>
          )}
          {localInsights.keyword_gaps?.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Keyword gaps</span>
              <div className="flex flex-wrap gap-1">
                {localInsights.keyword_gaps.map((gap) => (
                  <span key={gap} className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                    {gap}
                  </span>
                ))}
              </div>
            </div>
          )}
          {localInsights.section_suggestions?.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Section suggestions</span>
              <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-0.5">
                {localInsights.section_suggestions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {localInsights.bullet_rewrites?.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">Bullet rewrites</span>
              {localInsights.bullet_rewrites.map((item) => (
                <div key={item.original} className="text-xs space-y-0.5">
                  <p className="text-muted-foreground line-through">{item.original}</p>
                  <p className="text-foreground">{item.suggested}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ResumeInsightsSection;
