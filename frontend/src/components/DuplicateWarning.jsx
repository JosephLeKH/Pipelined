/** Inline warning shown when a duplicate application is detected on form submission. */

export function DuplicateWarning({ existingId }) {
  return (
    <div className="flex items-start gap-2 text-sm text-text-1" role="status">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
      <p>
        An application for this role and company already exists.{" "}
        <a
          href={`/dashboard?application=${existingId}`}
          className="font-medium text-brand-600 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
        >
          View existing application
        </a>
      </p>
    </div>
  );
}
