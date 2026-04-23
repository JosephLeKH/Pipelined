/** Skeleton placeholder for a calendar day cell — animated shimmer matching DayCell layout. */

const SHIMMER = "bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-shimmer";

function SkeletonCalendarCell() {
  return (
    <div
      className="min-h-[80px] border border-gray-100 p-1.5 dark:border-gray-700"
      data-testid="skeleton-calendar-cell"
      aria-hidden="true"
    >
      {/* Day number placeholder */}
      <span className={`inline-flex h-6 w-6 rounded-full ${SHIMMER}`} />
      {/* Event chip placeholder */}
      <div className="mt-1 flex flex-col gap-0.5">
        <span className={`h-4 w-full rounded ${SHIMMER}`} />
      </div>
    </div>
  );
}

export default SkeletonCalendarCell;
