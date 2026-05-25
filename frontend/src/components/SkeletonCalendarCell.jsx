/** Skeleton placeholder for a calendar day cell — 96px min-height matching PRD-06 §7.1. */

const SHIMMER = "shimmer-bg animate-shimmer";

function SkeletonCalendarCell() {
  return (
    <div
      className="min-h-24 border border-border-1 p-2"
      data-testid="skeleton-calendar-cell"
      aria-hidden="true"
    >
      <span className={`inline-block h-3 w-4 rounded ${SHIMMER}`} />
      <div className="mt-auto flex gap-1 pt-2">
        <span className={`h-1.5 w-1.5 rounded-full ${SHIMMER}`} />
        <span className={`h-1.5 w-1.5 rounded-full ${SHIMMER}`} />
      </div>
    </div>
  );
}

export default SkeletonCalendarCell;
