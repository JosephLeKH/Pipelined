/** Fit score display — sparkle + percent, no pill background (PRD-04 §7.4). */

import Sparkles from "lucide-react/dist/esm/icons/sparkles";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const FIT_STRONG_MIN = 80;
const FIT_GOOD_MIN = 60;
const FIT_PARTIAL_MIN = 40;

function scoreTextClass(score) {
  if (score >= FIT_STRONG_MIN) return "text-xs font-semibold text-text-1";
  if (score >= FIT_GOOD_MIN) return "text-xs font-semibold text-text-2";
  return "text-xs font-semibold text-text-3";
}

function FitBadge({ score }) {
  if (score === null || score === undefined) {
    return null;
  }

  const label = `${score}%`;
  const showSparkle = score >= FIT_STRONG_MIN;

  const tooltipContent = (
    <div className="flex flex-col gap-1 text-xs">
      <div className="font-medium">Fit score — 0–100</div>
      <div className="space-y-0.5">
        <div>• 80–100 Strong match</div>
        <div>• 60–79 Good match</div>
        <div>• 40–59 Partial match</div>
        <div>• 0–39 Weak match</div>
      </div>
      <div className="mt-1 pt-1 border-t border-white/20 text-[0.75rem]">
        Based on resume + JD analysis.
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex w-11 items-center justify-end gap-0.5 cursor-help"
            data-testid="fit-badge"
          >
            {showSparkle && (
              <Sparkles className="h-[0.6875rem] w-[0.6875rem] shrink-0 text-brand-600 dark:text-brand-400" aria-hidden="true" />
            )}
            <span className={scoreTextClass(score)}>{label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default FitBadge;
