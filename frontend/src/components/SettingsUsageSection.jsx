/** Settings billing section — plan badge, usage meters with threshold colors. */

import { AI_SCORE_LIMIT } from "../lib/constants";
import SettingsPageShell from "./SettingsPageShell";

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

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.8125rem] font-medium text-text-1">{label}</span>
        <span className="text-sm text-text-2">
          {used} / {max}
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
          <p className="text-[0.8125rem] font-medium text-text-1">Plan</p>
          <p className="mt-1 text-sm text-text-2">Free</p>
        </div>
        <p className="text-sm italic text-text-3">Paid plans are not yet available.</p>
      </div>

      <div className="mt-8 flex flex-col gap-5">
        <p className="text-[0.8125rem] font-medium text-text-1">Usage this month</p>
        <UsageMeter label="Applications" used={appCount} max={APP_LIMIT} />
        <UsageMeter label="Contacts" used={contactCount} max={CONTACT_LIMIT} />
      </div>

      <div className="mt-8 border-t border-border-1 pt-8">
        <p className="mb-1 text-[0.8125rem] font-medium text-text-1">AI usage</p>
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
