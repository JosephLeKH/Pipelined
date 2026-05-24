/** Unified fit score for list/card views — prefer ai_analysis, fall back to fit_score. */

export function getDisplayFitScore(application) {
  if (!application) return null;
  return application.ai_analysis?.fit_score ?? application.fit_score ?? null;
}
