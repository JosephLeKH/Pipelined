/** Fit score display — sparkle + percent, no pill background (PRD-04 §7.4). */

import Sparkles from "lucide-react/dist/esm/icons/sparkles";

const FIT_HIGH_MIN = 70;
const FIT_MED_MIN = 40;

function scoreTextClass(score) {
  if (score >= FIT_HIGH_MIN) return "text-xs font-semibold text-text-1";
  if (score >= FIT_MED_MIN) return "text-xs font-semibold text-text-2";
  return "text-xs font-semibold text-text-3";
}

function FitBadge({ score }) {
  if (score === null || score === undefined) {
    return null;
  }

  const label = `${score}%`;
  const showSparkle = score >= FIT_HIGH_MIN;

  return (
    <span
      className="inline-flex w-11 items-center justify-end gap-0.5"
      aria-label={`Fit score: ${label}`}
      data-testid="fit-badge"
    >
      {showSparkle && (
        <Sparkles className="h-[11px] w-[11px] shrink-0 text-brand-600" aria-hidden="true" />
      )}
      <span className={scoreTextClass(score)}>{label}</span>
    </span>
  );
}

export default FitBadge;
