/** Skeleton placeholders for Morning Brief page load — section cards with accent borders. */

import { CARD_BASE } from "../lib/designTokens";
import { BRIEF_SECTION_ORDER, BRIEF_SECTION_ACCENTS } from "../lib/briefConstants";

const SKELETON_SECTION_COUNT = 3;

function MorningBriefSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true" data-testid="morning-brief-skeleton">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex flex-col gap-4">
        {BRIEF_SECTION_ORDER.slice(0, SKELETON_SECTION_COUNT).map(({ key }) => (
          <div
            key={key}
            className={`${CARD_BASE} border-l-4 ${BRIEF_SECTION_ACCENTS[key]} overflow-hidden p-4`}
          >
            <div className="mb-3 h-4 w-28 animate-pulse rounded-md bg-muted" />
            <div className="space-y-3">
              <div className="h-10 animate-pulse rounded-md bg-muted" />
              <div className="h-10 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MorningBriefSkeleton;
