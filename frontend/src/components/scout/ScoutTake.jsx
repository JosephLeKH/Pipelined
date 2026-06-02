/** Scout's Take — full card (legacy) and compact strip (overview rail) variants. */

import ScoutAvatar from "./ScoutAvatar";

function suggestedNextStep(app) {
  if (app.follow_up_date) {
    const dueDate = new Date(app.follow_up_date).getTime();
    if (dueDate < Date.now()) return "send follow-up (overdue)";
  }
  if (!app.apply_pack && app.current_stage === "To Apply") return "draft your apply pack";
  if (!app.interview_prep_briefing && app.current_stage?.includes("Interview")) {
    return "prep for the interview";
  }
  return "review the latest activity";
}

function scoreColor(score) {
  if (score >= 85) return "text-brand-700 dark:text-brand-300";
  if (score >= 65) return "text-text-1";
  return "text-text-2";
}

function ScoutTakeStrip({ application, onAskScout, onPrimaryAction }) {
  const next = suggestedNextStep(application);
  return (
    <section
      aria-label="Scout's Take"
      className="flex items-center gap-3 rounded-md border border-brand-100 bg-brand-50/40 px-3 py-2 dark:border-brand-900/40 dark:bg-brand-900/10"
    >
      <ScoutAvatar size="sm" state="idle" />
      <p className="min-w-0 flex-1 truncate text-xs text-text-2">
        <span className="font-medium text-text-1">Scout</span> · Next:{" "}
        <span className="text-text-1">{next}</span>
      </p>
      <div className="flex shrink-0 items-center gap-1">
        {onPrimaryAction && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2"
          >
            Take action
          </button>
        )}
        <button
          type="button"
          onClick={onAskScout}
          className="rounded-md border border-border-1 bg-surface-0 px-2 py-1 text-xs text-text-1 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2"
        >
          Ask →
        </button>
      </div>
    </section>
  );
}

function ScoutTakeCard({ application, onAskScout, onPrimaryAction }) {
  const scoring = application.fit_score == null && application.fit_score_status !== "no_resume";
  const noResume = application.fit_score_status === "no_resume";

  return (
    <section
      aria-label="Scout's Take"
      className="rounded-md border border-border-1 bg-surface-1 px-3 py-3"
    >
      <header className="mb-2 flex items-center gap-2">
        <ScoutAvatar size="sm" state="idle" />
        <span className="text-xs font-semibold uppercase tracking-wide text-text-3">
          Scout's Take
        </span>
      </header>

      {scoring && (
        <p className="text-sm text-text-2" aria-live="polite">
          Scout is scoring this role…
        </p>
      )}

      {noResume && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-text-2">Scout can't score this without your resume.</p>
          <a
            href="/settings"
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            Upload resume →
          </a>
        </div>
      )}

      {application.fit_score != null && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-semibold tabular-nums ${scoreColor(application.fit_score)}`}>
              {application.fit_score}
            </span>
            <span className="text-xs text-text-3">/ 100 fit</span>
          </div>
          {application.fit_score_summary && (
            <p className="text-sm text-text-1">{application.fit_score_summary}</p>
          )}
          <p className="text-xs text-text-3">
            Next step: {suggestedNextStep(application)}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {onPrimaryAction && (
              <button
                type="button"
                onClick={onPrimaryAction}
                className="rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2"
              >
                Take action
              </button>
            )}
            <button
              type="button"
              onClick={onAskScout}
              className="rounded-md border border-border-1 bg-surface-0 px-2 py-1 text-xs text-text-1 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2"
            >
              Ask Scout about this role →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ScoutTake({ application, onAskScout, onPrimaryAction, variant = "card" }) {
  if (variant === "strip") {
    return (
      <ScoutTakeStrip
        application={application}
        onAskScout={onAskScout}
        onPrimaryAction={onPrimaryAction}
      />
    );
  }
  return (
    <ScoutTakeCard
      application={application}
      onAskScout={onAskScout}
      onPrimaryAction={onPrimaryAction}
    />
  );
}

export default ScoutTake;
