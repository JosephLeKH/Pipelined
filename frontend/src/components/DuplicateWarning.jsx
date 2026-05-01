/** Inline warning shown when a duplicate application is detected on form submission. */

export function DuplicateWarning({ existingId }) {
  return (
    <div className="rounded border border-border bg-muted px-3 py-2 text-sm text-foreground">
      An application for this role and company already exists.{" "}
      <a
        href={`/dashboard?application=${existingId}`}
        className="font-medium underline hover:text-foreground transition-colors"
      >
        View existing application
      </a>
    </div>
  );
}
