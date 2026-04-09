/** Skeleton placeholder for a calendar day cell — animated shimmer matching DayCell layout. */

function SkeletonCalendarCell() {
  return (
    <div
      className="min-h-[80px] border border-gray-100 p-1.5 dark:border-gray-700"
      data-testid="skeleton-calendar-cell"
      aria-hidden="true"
    >
      {/* Day number placeholder */}
      <span className="inline-flex h-6 w-6 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
      {/* Event chip placeholder */}
      <div className="mt-1 flex flex-col gap-0.5">
        <span className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

export default SkeletonCalendarCell;
