/** Canonical AI copy, icons, and error helpers for Pipelined surfaces. */

export const FIT_SCORE_LABEL = "Fit score";
export const STALE_APPLICATIONS_LABEL = "Stale applications";
export const MIN_FIT_SCORE_LABEL = "Minimum fit score";
export const AI_LIMIT_MESSAGE = "Daily AI limit reached. Resets at midnight UTC.";

/**
 * Icon choices for AI surfaces — reserve Sparkles for true generative actions only.
 * Import the matching lucide subpath in each component; names here are documentation.
 */
export const AI_ICONS = {
  fitScore: { icon: "Sparkles", usage: "Generative fit scoring button in application detail" },
  resumeInsights: { icon: "Sparkles", usage: "Generative resume insights analyze action" },
  followUpDraft: { icon: "Mail", usage: "Follow-up email draft generation" },
  jobRecommendations: { icon: "TrendingUp", usage: "Heuristic job recommendations strip header" },
  interviewPrepIdle: { icon: "BookOpen", usage: "Interview prep idle briefing card header" },
  interviewPrepStart: { icon: "Sparkles", usage: "Start Research generative action button" },
};

export function formatFitScore(value) {
  return `${FIT_SCORE_LABEL} ${value}`;
}

export function isAiLimitError(error) {
  if (!error) return false;
  if (error.code === "RATE_LIMIT_EXCEEDED") return true;
  const text = String(error.message ?? error.detail ?? "");
  return /daily ai|daily.*limit|rate limit|quota exceeded/i.test(text);
}

export function getAiToastError(error, fallback) {
  return isAiLimitError(error) ? AI_LIMIT_MESSAGE : fallback;
}

export const COPILOT_TITLE = "Co-pilot";
export const COPILOT_SUBTITLE = "Grounded in your pipeline — suggestions only.";
export const COPILOT_PLACEHOLDER = "Ask about priorities, follow-ups, or interview prep…";
export const COPILOT_ERROR_FALLBACK = "Co-pilot unavailable. Please try again.";
export const COPILOT_RATE_LIMIT_MESSAGE = "Co-pilot rate limit reached. Try again later.";

export const COPILOT_SUGGESTED_PROMPTS = [
  "What should I prioritize today?",
  "Which applications need follow-up?",
  "Where should I prep for interviews?",
];
