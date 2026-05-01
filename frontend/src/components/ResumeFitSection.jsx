/** Displays AI-powered resume fit analysis with score, summary, and skill matching. */

import { useEffect } from "react";

import FitBadge from "./FitBadge";
import { trackEvent } from "../lib/analytics";

function ResumeFitSection({ analysis, aiScoresRemainingToday }) {
  useEffect(() => {
    if (analysis?.fit_score != null) {
      trackEvent("fit_score_viewed", { score: analysis.fit_score });
    }
  }, [analysis?.fit_score]);

  const quotaExceeded = aiScoresRemainingToday === 0 && !analysis?.fit_score;

  if (quotaExceeded) {
    return (
      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium uppercase text-muted-foreground">Resume Fit</span>
        <p className="text-sm text-amber-600 dark:text-amber-500">
          Daily limit reached. Resets tomorrow.
        </p>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-medium uppercase text-muted-foreground">Resume Fit</span>
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold text-foreground">
          {analysis.fit_score ?? "—"}
        </span>
        <FitBadge score={analysis.fit_score} />
      </div>
      {analysis.summary && (
        <p className="text-sm text-muted-foreground">{analysis.summary}</p>
      )}
      {analysis.matched_skills?.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Matched skills</span>
          <div className="flex flex-wrap gap-1">
            {analysis.matched_skills.map((skill) => (
              <span key={skill} className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-400">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
      {analysis.missing_skills?.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Missing skills</span>
          <div className="flex flex-wrap gap-1">
            {analysis.missing_skills.map((skill) => (
              <span key={skill} className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/40 dark:text-red-400">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumeFitSection;
