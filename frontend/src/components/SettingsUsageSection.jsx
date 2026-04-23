/** Settings usage section — tier badge, usage meters, and upgrade teaser. */

const APP_LIMIT = 100;
const CONTACT_LIMIT = 50;
const AI_SCORE_LIMIT = 10;

function UsageMeter({ label, used, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {used} / {max}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-300"
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
    <div className="rounded-card border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Usage & Plan
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Your current usage against plan limits.
          </p>
        </div>
        <span className="rounded-badge bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
          Free Plan
        </span>
      </div>

      <div className="flex flex-col gap-5">
        <UsageMeter label="Applications" used={appCount} max={APP_LIMIT} />
        <UsageMeter label="Contacts" used={contactCount} max={CONTACT_LIMIT} />
        <UsageMeter label="AI fit scores today" used={aiScores} max={AI_SCORE_LIMIT} />
      </div>

      <div className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-700">
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Upgrade to Pro for unlimited applications, contacts, and AI scoring.
        </p>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="flex cursor-not-allowed items-center gap-2 rounded-button bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2 text-sm font-medium text-white opacity-60"
        >
          Upgrade to Pro — Coming soon
        </button>
      </div>
    </div>
  );
}

export default SettingsUsageSection;
