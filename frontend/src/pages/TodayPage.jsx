/** Mission Control today page — prioritized missions with snooze/done actions. */

import { useCallback, useEffect } from "react";

import Check from "lucide-react/dist/esm/icons/check";
import Sun from "lucide-react/dist/esm/icons/sun";

import MissionCard from "../components/MissionCard";
import MissionProgressStrip from "../components/MissionProgressStrip";
import MorningBriefHistoryPanel from "../components/MorningBriefHistoryPanel";
import WeeklyReviewSection from "../components/WeeklyReviewSection";
import MorningBriefSkeleton from "../components/MorningBriefSkeleton";
import { useAuth } from "../context/AuthContext";
import { useMissionActions } from "../hooks/useMissionActions";
import { useMorningBrief } from "../hooks/useMorningBrief";
import { useWeeklyReview } from "../hooks/useWeeklyReview";
import {
  BRIEF_UNAVAILABLE_MESSAGE,
  DEFAULT_MORNING_BRIEF_HOUR,
  getBriefEmptyMessage,
} from "../lib/briefConstants";
import { TODAY_VISITED_KEY } from "../lib/constants";
import { formatTodayDateRow, formatTodayGreeting } from "../lib/todayUtils";

function TodayGreeting({ user, briefDate, missionCount }) {
  const timezone = user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dateRow = formatTodayDateRow(briefDate, missionCount, timezone);

  return (
    <header className="pb-6 pt-8">
      <p className="text-xs font-medium uppercase tracking-wider text-text-3">
        {dateRow}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-1">
        {formatTodayGreeting(user)}
      </h1>
    </header>
  );
}

function TodaySectionHeading({ children }) {
  return (
    <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-3">
      {children}
    </h2>
  );
}

function TodayEmptyState() {
  return (
    <div
      className="flex flex-col items-center py-16 text-center motion-safe:animate-fade-in-up"
      role="status"
    >
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30"
        aria-hidden="true"
      >
        <Check className="h-6 w-6 text-brand-600" />
      </div>
      <p className="text-base font-semibold text-text-1">You&apos;re caught up.</p>
      <p className="mt-1 max-w-sm text-sm text-text-3">
        No missions ranked for today. Enjoy the breather.
      </p>
    </div>
  );
}

function TodayMissionsList({
  missions,
  onSnooze,
  onDone,
  snoozePendingId,
  donePendingId,
}) {
  if (!missions.length) {
    return <TodayEmptyState />;
  }

  return (
    <section aria-label="Today's missions">
      <TodaySectionHeading>Today&apos;s missions</TodaySectionHeading>
      <ul className="overflow-hidden rounded-lg border border-border-1 bg-surface-0">
        {missions.map((mission) => (
          <MissionCard
            key={mission.id}
            mission={mission}
            onSnooze={onSnooze}
            onDone={onDone}
            isSnoozing={snoozePendingId === mission.id}
            isCompleting={donePendingId === mission.id}
          />
        ))}
      </ul>
    </section>
  );
}

function TodayBriefUnavailable() {
  return (
    <div className="rounded-lg border border-border-1 bg-surface-1 p-6 text-center">
      <Sun className="mx-auto mb-3 h-8 w-8 text-text-3" aria-hidden="true" />
      <p className="font-medium text-text-1">Brief not ready</p>
      <p className="mt-1 text-sm text-text-3">{BRIEF_UNAVAILABLE_MESSAGE}</p>
    </div>
  );
}

function TodayPage() {
  useEffect(() => {
    localStorage.setItem(TODAY_VISITED_KEY, "true");
  }, []);

  const { user } = useAuth();
  const { data: brief, isLoading, isError } = useMorningBrief();
  const weeklyReviewEnabled = user?.weekly_review_enabled !== false;
  const { data: weeklyReview, isLoading: isReviewLoading } = useWeeklyReview({
    enabled: weeklyReviewEnabled,
  });
  const { snooze, done } = useMissionActions();
  const briefHour = user?.morning_brief_hour ?? DEFAULT_MORNING_BRIEF_HOUR;
  const emptyMessage = getBriefEmptyMessage(briefHour);
  const missions = brief?.missions ?? [];
  const progress = brief?.mission_progress ?? { cleared: 0, total: 0 };

  const handleSnooze = useCallback(
    (missionId) => snooze.mutate(missionId),
    [snooze],
  );

  const handleDone = useCallback(
    (missionId) => done.mutate(missionId),
    [done],
  );

  return (
    <main className="flex-1 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-8">
        {isLoading && (
          <>
            <TodayGreeting user={user} briefDate={null} missionCount={0} />
            <MorningBriefSkeleton />
          </>
        )}

        {!isLoading && isError && (
          <>
            <TodayGreeting user={user} briefDate={null} missionCount={0} />
            <TodayBriefUnavailable />
          </>
        )}

        {!isLoading && !isError && brief && (
          <>
            <TodayGreeting
              user={user}
              briefDate={brief.date}
              missionCount={missions.length}
            />
            <TodayMissionsList
              missions={missions}
              onSnooze={handleSnooze}
              onDone={handleDone}
              snoozePendingId={snooze.isPending ? snooze.variables : null}
              donePendingId={done.isPending ? done.variables : null}
            />
            {!missions.length && emptyMessage && (
              <p className="text-center text-sm text-text-3">{emptyMessage}</p>
            )}
            <MissionProgressStrip cleared={progress.cleared} total={progress.total} />
            {weeklyReviewEnabled && (
              <WeeklyReviewSection review={weeklyReview} isLoading={isReviewLoading} />
            )}
            <MorningBriefHistoryPanel />
          </>
        )}
      </div>
    </main>
  );
}

export default TodayPage;
