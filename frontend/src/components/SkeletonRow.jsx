/** Skeleton placeholder row for ApplicationList — animated shimmer bars matching column layout. */

function SkeletonRow() {
  return (
    <div
      className="flex h-16 items-center gap-4 border-b border-gray-100 px-4 dark:border-gray-700"
      data-testid="skeleton-row"
      aria-hidden="true"
    >
      {/* Checkbox */}
      <span className="h-4 w-4 shrink-0 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      {/* Stale indicator placeholder */}
      <span className="w-2 shrink-0" />
      {/* Company */}
      <span className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      {/* Role */}
      <span className="h-4 flex-1 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      {/* Stage pill */}
      <span className="h-5 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
      {/* Date */}
      <span className="h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      {/* Source icon */}
      <span className="h-4 w-4 shrink-0 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      {/* Row menu */}
      <span className="h-4 w-4 shrink-0 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

export default SkeletonRow;
