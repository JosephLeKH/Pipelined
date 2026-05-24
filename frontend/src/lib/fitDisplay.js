/** Unified fit score for list/card views — prefer ai_analysis, fall back to fit_score. */

export const BACKGROUND_SCORE_WINDOW_MS = 120_000;
export const BACKGROUND_SCORE_POLL_MS = 3_000;

export function getDisplayFitScore(application) {
  if (!application) return null;
  return application.ai_analysis?.fit_score ?? application.fit_score ?? null;
}

export function getUnifiedFitDetail(application) {
  if (!application) return null;

  const analysis = application.ai_analysis;
  if (analysis?.fit_score != null) {
    return {
      score: analysis.fit_score,
      reason: analysis.summary ?? null,
      matchedSkills: analysis.matched_skills ?? [],
      missingSkills: analysis.missing_skills ?? [],
      source: "ai_analysis",
    };
  }

  if (application.fit_score != null) {
    return {
      score: application.fit_score,
      reason: application.fit_score_reason ?? null,
      matchedSkills: [],
      missingSkills: [],
      source: "fit_score",
    };
  }

  return null;
}

export function isBackgroundScoringPending(application, hasResume) {
  if (!hasResume || getDisplayFitScore(application) != null) return false;

  const timestamp = application.date_applied ?? application.updated_at;
  if (!timestamp) return false;

  const ageMs = Date.now() - new Date(timestamp).getTime();
  return ageMs >= 0 && ageMs < BACKGROUND_SCORE_WINDOW_MS;
}
