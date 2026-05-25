/** Weekly digest email toggle — Linear-style surface card with Cardinal switch. */

function DigestSection({ digestEnabled, isDigestPending, onDigestToggle }) {
  return (
    <section className="rounded-lg border border-border-1 bg-surface-1 p-4">
      <h2 className="text-sm font-semibold text-text-1">Weekly digest email</h2>
      <p className="mt-1 text-xs text-text-3">
        Receive a weekly summary of your job search activity every Monday morning.
      </p>
      <div className="mt-4 flex cursor-pointer items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={digestEnabled}
          aria-label="Weekly digest email"
          disabled={isDigestPending}
          onClick={() => onDigestToggle(!digestEnabled)}
          className={[
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full",
            "transition-colors motion-safe:duration-hover",
            "focus:outline-none focus-visible:outline focus-visible:outline-2",
            "focus-visible:outline-brand-600 focus-visible:outline-offset-2",
            "dark:focus-visible:outline-1",
            "disabled:cursor-not-allowed disabled:opacity-60",
            digestEnabled ? "bg-brand-600" : "bg-surface-3",
          ].join(" ")}
        >
          <span
            className={[
              "inline-block h-4 w-4 rounded-full bg-white shadow",
              "motion-safe:transition-transform motion-safe:duration-hover",
              "motion-reduce:transition-none",
              digestEnabled ? "translate-x-6" : "translate-x-1",
            ].join(" ")}
          />
        </button>
        <span className="text-sm text-text-2">
          {digestEnabled ? "Enabled" : "Disabled"}
        </span>
      </div>
    </section>
  );
}

export default DigestSection;
