/** Morning brief page: prioritized daily action cards from GET /api/brief/today. */

import Sun from "lucide-react/dist/esm/icons/sun";

import EmptyState from "../components/EmptyState";
import MorningBriefHistoryPanel from "../components/MorningBriefHistoryPanel";
import MorningBriefSectionCard from "../components/MorningBriefSectionCard";
import MorningBriefSkeleton from "../components/MorningBriefSkeleton";
import { useAuth } from "../context/AuthContext";
import { useMorningBrief } from "../hooks/useMorningBrief";
import {
  BRIEF_SECTION_ORDER,
  BRIEF_UNAVAILABLE_MESSAGE,
  DEFAULT_MORNING_BRIEF_HOUR,
  getBriefEmptyMessage,
} from "../lib/briefConstants";

function MorningBriefHero({ date }) {
  return (
    <header className="space-y-1 pb-2">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30"
          aria-hidden="true"
        >
          <Sun className="h-6 w-6 text-brand-500" />
        </div>
        <div>
          <h1 className=" text-2xl font-semibold text-foreground">
            Morning Brief
          </h1>
          {date && (
            <p className="mt-0.5 text-sm text-muted-foreground">{date}</p>
          )}
        </div>
      </div>
    </header>
  );
}

function MorningBriefContent({ brief, emptyMessage }) {
  const sections = brief?.sections ?? {};
  const hasItems = BRIEF_SECTION_ORDER.some(({ key }) => sections[key]?.length > 0);

  if (!hasItems) {
    return (
      <EmptyState
        icon={Sun}
        title="All caught up"
        description={brief?.summary_line ?? emptyMessage}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {brief.summary_line && (
        <p className="text-sm leading-relaxed text-muted-foreground">{brief.summary_line}</p>
      )}
      {BRIEF_SECTION_ORDER.map(({ key, label }) => (
        <MorningBriefSectionCard
          key={key}
          sectionKey={key}
          label={label}
          items={sections[key]}
        />
      ))}
    </div>
  );
}

function MorningBriefPage() {
  const { user } = useAuth();
  const { data: brief, isLoading, isError } = useMorningBrief();
  const briefHour = user?.morning_brief_hour ?? DEFAULT_MORNING_BRIEF_HOUR;
  const emptyMessage = getBriefEmptyMessage(briefHour);

  return (
    <main className="flex-1 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {!isLoading && !isError && brief && <MorningBriefHero date={brief.date} />}
          {isLoading && (
            <>
              <MorningBriefHero date={null} />
              <MorningBriefSkeleton />
            </>
          )}

          {!isLoading && isError && (
            <>
              <MorningBriefHero date={null} />
              <EmptyState icon={Sun} title="Brief not ready" description={BRIEF_UNAVAILABLE_MESSAGE} />
            </>
          )}

          {!isLoading && !isError && brief && (
            <>
              <MorningBriefContent brief={brief} emptyMessage={emptyMessage} />
              <MorningBriefHistoryPanel />
            </>
          )}
        </div>
      </main>
  );
}

export default MorningBriefPage;
