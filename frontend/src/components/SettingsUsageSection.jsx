/** Settings usage section — tier badge, usage meters, and upgrade teaser. */

import { Button } from "./ui/button";

const APP_LIMIT = 100;
const CONTACT_LIMIT = 50;
const AI_SCORE_LIMIT = 10;

function UsageMeter({ label, used, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">
          {used} / {max}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label}
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
    <div className="rounded-xl bg-card border border-border p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            Usage & Plan
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Your current usage against plan limits.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          Free Plan
        </span>
      </div>

      <div className="flex flex-col gap-5">
        <UsageMeter label="Applications" used={appCount} max={APP_LIMIT} />
        <UsageMeter label="Contacts" used={contactCount} max={CONTACT_LIMIT} />
        <UsageMeter label="AI fit scores today" used={aiScores} max={AI_SCORE_LIMIT} />
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <p className="mb-3 text-sm text-muted-foreground">
          Upgrade to Pro for unlimited applications, contacts, and AI scoring.
        </p>
        <Button
          type="button"
          disabled
          title="Coming soon"
          className="cursor-not-allowed gap-2 opacity-60"
        >
          Upgrade to Pro — Coming soon
        </Button>
      </div>
    </div>
  );
}

export default SettingsUsageSection;
