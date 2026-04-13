/** Displays AI-powered resume fit analysis with score, summary, and skill matching. */

import { useEffect } from "react";

import FitBadge from "./FitBadge";
import { trackEvent } from "../lib/analytics";

function ResumeFitSection({ analysis }) {
  useEffect(() => {
    if (analysis.fit_score != null) {
      trackEvent("fit_score_viewed", { score: analysis.fit_score });
    }
  }, [analysis.fit_score]);

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">Resume Fit</span>
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {analysis.fit_score ?? "—"}
        </span>
        <FitBadge score={analysis.fit_score} />
      </div>
      {analysis.summary && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{analysis.summary}</p>
      )}
      {analysis.matched_skills?.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Matched skills</span>
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
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Missing skills</span>
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
