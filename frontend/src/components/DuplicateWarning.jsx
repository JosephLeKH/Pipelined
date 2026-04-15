/** Inline warning shown when a duplicate application is detected on form submission. */

export function DuplicateWarning({ existingId }) {
  return (
    <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      An application for this role and company already exists.{" "}
      <a
        href={`/dashboard?application=${existingId}`}
        className="font-medium underline hover:text-amber-900"
      >
        View existing application
      </a>
    </div>
  );
}
