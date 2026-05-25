/** Skeleton placeholders for Today page load — matches mission row + brief layout. */

import { BRIEF_SECTION_ORDER } from "../lib/briefConstants";

const SKELETON_MISSION_COUNT = 3;
const SKELETON_BRIEF_SECTION_COUNT = 2;
const SKELETON_ROW_ROWS_PER_SECTION = 2;

const PULSE = "animate-pulse rounded-md bg-surface-2 motion-reduce:animate-none";

function SkeletonMissionRow() {
  return (
    <li
      className="flex items-center gap-3 border-b border-border-1 px-3 py-3"
      aria-hidden="true"
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PULSE}`} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className={`h-3.5 w-4/5 max-w-xs ${PULSE}`} />
        <div className={`h-3 w-1/2 max-w-[10rem] ${PULSE}`} />
      </div>
    </li>
  );
}

function SkeletonBriefRows() {
  return (
    <ul className="overflow-hidden rounded-lg border border-border-1 bg-surface-0">
      {Array.from({ length: SKELETON_ROW_ROWS_PER_SECTION }, (_, i) => (
        <li
          key={i}
          className="flex items-start gap-3 border-b border-border-1 px-3 py-3 last:border-b-0"
          aria-hidden="true"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className={`h-3.5 w-3/5 max-w-[14rem] ${PULSE}`} />
            <div className={`h-3 w-2/5 max-w-[8rem] ${PULSE}`} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function MorningBriefSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true" data-testid="morning-brief-skeleton">
      <div
        className="h-16 rounded-lg border border-border-1 bg-surface-1 p-4"
        data-testid="skeleton-weekly-goal"
      >
        <div className={`mb-2 h-3 w-40 ${PULSE}`} />
        <div className={`h-1.5 w-[12.5rem] max-w-full ${PULSE}`} />
      </div>

      <div>
        <div className={`mb-2 h-3 w-28 ${PULSE}`} />
        <ul className="overflow-hidden rounded-lg border border-border-1 bg-surface-0">
          {Array.from({ length: SKELETON_MISSION_COUNT }, (_, i) => (
            <SkeletonMissionRow key={i} />
          ))}
        </ul>
      </div>

      <div>
        <div className={`mb-2 h-3 w-36 ${PULSE}`} />
        <div
          className="flex h-14 items-center gap-3 rounded-lg border border-border-1 bg-surface-1 p-4"
          data-testid="skeleton-brief-collapsed"
        >
          <span className={`h-4 w-4 shrink-0 rounded ${PULSE}`} />
          <span className={`h-3.5 flex-1 max-w-xs ${PULSE}`} />
        </div>
      </div>

      <div className="space-y-4">
        {BRIEF_SECTION_ORDER.slice(0, SKELETON_BRIEF_SECTION_COUNT).map(({ key }) => (
          <div key={key}>
            <div className={`mb-2 h-3 w-24 ${PULSE}`} />
            <SkeletonBriefRows />
          </div>
        ))}
      </div>
    </div>
  );
}

export default MorningBriefSkeleton;
