/** Settings billing section — plan badge, usage meters with threshold colors. */

import { AI_SCORE_LIMIT } from "../lib/constants";
import SettingsPageShell from "./SettingsPageShell";
import { Button } from "./ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

const APP_LIMIT = 100;
const CONTACT_LIMIT = 50;
const USAGE_WARN_THRESHOLD_PCT = 80;
const USAGE_LIMIT_THRESHOLD_PCT = 100;
const BAR_HEIGHT_CLASS = "h-1";

function usagePercent(used, max) {
  return max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
}

function barFillClass(pct) {
  if (pct >= USAGE_LIMIT_THRESHOLD_PCT) {
    return "bg-brand-700";
  }
  if (pct >= USAGE_WARN_THRESHOLD_PCT) {
    return "bg-status-warn";
  }
  return "bg-brand-600";
}

function UsageMeter({ label, used, max }) {
  const pct = usagePercent(used, max);
  const atLimit = pct >= USAGE_LIMIT_THRESHOLD_PCT;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-text-1">{label}</span>
        <span className="flex items-center gap-2 text-sm text-text-2">
          {used} / {max}
          {atLimit ? (
            <Button
              type="button"
              variant="link"
              disabled
              className="h-auto p-0 text-xs font-medium text-brand-600 opacity-60"
            >
              Upgrade
            </Button>
          ) : null}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className={`relative w-full overflow-hidden rounded-full bg-surface-2 ${BAR_HEIGHT_CLASS}`}
      >
        <div
          className={`${BAR_HEIGHT_CLASS} w-full motion-reduce:transition-none transition-[transform] duration-200 ease-out ${barFillClass(pct)}`}
          style={{ transform: `translateX(-${100 - pct}%)` }}
        />
      </div>
    </div>
  );
}

function SettingsUsageSection({ user }) {
  const appCount = user?.application_count ?? 0;
  const contactCount = user?.contact_count ?? 0;
  const aiScores = user?.ai_scores_today ?? 0;

  return (
    <SettingsPageShell
      title="Plan & usage"
      subtitle="Your current usage against plan limits."
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-text-1">Plan</p>
          <p className="mt-1 text-sm text-text-2">Free</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" disabled className="cursor-not-allowed opacity-60">
              Upgrade to Pro
            </Button>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
      </div>

      <div className="mt-8 flex flex-col gap-5">
        <p className="text-[13px] font-medium text-text-1">Usage this month</p>
        <UsageMeter label="Applications" used={appCount} max={APP_LIMIT} />
        <UsageMeter label="Contacts" used={contactCount} max={CONTACT_LIMIT} />
      </div>

      <div className="mt-8 border-t border-border-1 pt-8">
        <p className="mb-1 text-[13px] font-medium text-text-1">AI usage</p>
        <p className="mb-4 text-xs text-text-3">
          Fit scores, resume insights, follow-up drafts, and interview prep share this daily limit.
          Resets at midnight UTC.
        </p>
        <UsageMeter label="AI fit scores today" used={aiScores} max={AI_SCORE_LIMIT} />
      </div>
    </SettingsPageShell>
  );
}

export default SettingsUsageSection;
