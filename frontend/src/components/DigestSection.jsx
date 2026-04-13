/** Weekly digest email toggle section. */

function DigestSection({ digestEnabled, isDigestPending, onDigestToggle }) {
  return (
    <section className="rounded-card border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-100">
        Weekly digest email
      </h2>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Receive a weekly summary of your job search activity every Monday morning.
      </p>
      <label className="flex cursor-pointer items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={digestEnabled}
          aria-label="Weekly digest email"
          disabled={isDigestPending}
          onClick={() => onDigestToggle(!digestEnabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 ${digestEnabled ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600"}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${digestEnabled ? "translate-x-6" : "translate-x-1"}`}
          />
        </button>
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {digestEnabled ? "Enabled" : "Disabled"}
        </span>
      </label>
    </section>
  );
}

export default DigestSection;
