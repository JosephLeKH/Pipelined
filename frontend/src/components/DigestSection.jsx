/** Weekly digest email toggle section. */

function DigestSection({ digestEnabled, isDigestPending, onDigestToggle }) {
  return (
    <section className="rounded-xl bg-card border border-border p-6">
      <h2 className="mb-1 font-display text-base font-semibold text-foreground">
        Weekly digest email
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
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
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-60 ${digestEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${digestEnabled ? "translate-x-6" : "translate-x-1"}`}
          />
        </button>
        <span className="text-sm text-foreground">
          {digestEnabled ? "Enabled" : "Disabled"}
        </span>
      </label>
    </section>
  );
}

export default DigestSection;
