/** Colored pill displaying AI resume-job fit score. */

import { BADGE_FIT_HIGH, BADGE_FIT_MEDIUM, BADGE_FIT_LOW, BADGE_FIT_CRITICAL } from "../lib/designTokens";

const FIT_HIGH_MIN = 80;
const FIT_MED_MIN = 50;
const FIT_LOW_MIN = 30;

function fitColor(score) {
  if (score === null || score === undefined) {
    return "bg-muted text-muted-foreground";
  }
  if (score >= FIT_HIGH_MIN) return BADGE_FIT_HIGH;
  if (score >= FIT_MED_MIN) return BADGE_FIT_MEDIUM;
  if (score >= FIT_LOW_MIN) return BADGE_FIT_LOW;
  return BADGE_FIT_CRITICAL;
}

function FitBadge({ score }) {
  const label = score === null || score === undefined ? "—" : `${score}%`;
  const colorClass = fitColor(score);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
      aria-label={`Fit score: ${label}`}
      data-testid="fit-badge"
    >
      {label}
    </span>
  );
}

export default FitBadge;
