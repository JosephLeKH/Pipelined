/** Unified fit score for list/card views — prefer ai_analysis, fall back to fit_score. */

import { formatDistanceToNow } from "date-fns/formatDistanceToNow";

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
      reason: analysis.match_reason ?? analysis.summary ?? null,
      matchedSkills: analysis.matched_skills ?? [],
      missingSkills: analysis.missing_skills ?? [],
      source: "ai_analysis",
    };
  }

  if (application.fit_score != null) {
    return {
      score: application.fit_score,
      reason: application.match_reason ?? application.fit_score_reason ?? null,
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

export function getAiFreshnessTimestamp(application, type) {
  switch (type) {
    case "fit_score":
      return application.ai_analysis?.scored_at ?? application.fit_score_computed_at;
    case "apply_pack":
      return application.apply_pack_at;
    case "resume_insights":
      return application.resume_insights_at;
    case "thread_summary":
      return application.thread_summary_at;
    default:
      return null;
  }
}

export function formatAiFreshness(timestamp) {
  if (!timestamp) return null;
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return null;
  }
}
