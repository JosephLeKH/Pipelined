/** Skeleton placeholder row for ApplicationList — animated shimmer bars matching column layout. */

const SHIMMER = "shimmer-bg animate-shimmer";

function SkeletonRow() {
  return (
    <div
      className="flex h-16 items-center gap-4 border-b border-gray-100 px-4 dark:border-gray-700"
      data-testid="skeleton-row"
      aria-hidden="true"
    >
      {/* Checkbox */}
      <span className={`h-4 w-4 shrink-0 rounded ${SHIMMER}`} />
      {/* Stale indicator placeholder */}
      <span className="w-2 shrink-0" />
      {/* Company */}
      <span className={`h-4 w-40 rounded ${SHIMMER}`} />
      {/* Role */}
      <span className={`h-4 flex-1 rounded ${SHIMMER}`} />
      {/* Stage pill */}
      <span className={`h-5 w-20 rounded-full ${SHIMMER}`} />
      {/* Date */}
      <span className={`h-4 w-28 rounded ${SHIMMER}`} />
      {/* Source icon */}
      <span className={`h-4 w-4 shrink-0 rounded ${SHIMMER}`} />
      {/* Row menu */}
      <span className={`h-4 w-4 shrink-0 rounded ${SHIMMER}`} />
    </div>
  );
}

export default SkeletonRow;
