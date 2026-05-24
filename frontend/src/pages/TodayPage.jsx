/** Mission Control today page — prioritized missions with snooze/done actions. */

import { useCallback } from "react";

import Sun from "lucide-react/dist/esm/icons/sun";

import EmptyState from "../components/EmptyState";
import MissionCard from "../components/MissionCard";
import MissionProgressStrip from "../components/MissionProgressStrip";
import MorningBriefHistoryPanel from "../components/MorningBriefHistoryPanel";
import MorningBriefSkeleton from "../components/MorningBriefSkeleton";
import NavBar from "../components/NavBar";
import { useAuth } from "../context/AuthContext";
import { useMissionActions } from "../hooks/useMissionActions";
import { useMorningBrief } from "../hooks/useMorningBrief";
import {
  BRIEF_UNAVAILABLE_MESSAGE,
  DEFAULT_MORNING_BRIEF_HOUR,
  getBriefEmptyMessage,
} from "../lib/briefConstants";
import { CARD_BASE } from "../lib/designTokens";

function TodayHero({ date, topMission }) {
  return (
    <header className="space-y-3 pb-2">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30"
          aria-hidden="true"
        >
          <Sun className="h-6 w-6 text-brand-500" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Today</h1>
          {date && <p className="mt-0.5 text-sm text-muted-foreground">{date}</p>}
        </div>
      </div>
      {topMission && (
        <div className={`${CARD_BASE} border-l-4 border-brand-500 p-4`}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Top priority
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-foreground">
            {topMission.title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{topMission.reason}</p>
        </div>
      )}
    </header>
  );
}

function TodayContent({ brief, emptyMessage, onSnooze, onDone, snoozePendingId, donePendingId }) {
  const missions = brief?.missions ?? [];

  if (!missions.length) {
    return (
      <EmptyState
        icon={Sun}
        title="All caught up"
        description={brief?.summary_line ?? emptyMessage}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
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
    </div>
  );
}

function TodayPage() {
  const { user } = useAuth();
  const { data: brief, isLoading, isError } = useMorningBrief();
  const { snooze, done } = useMissionActions();
  const briefHour = user?.morning_brief_hour ?? DEFAULT_MORNING_BRIEF_HOUR;
  const emptyMessage = getBriefEmptyMessage(briefHour);
  const topMission = brief?.missions?.[0] ?? null;
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
    <div className="flex min-h-screen flex-col bg-background">
      <NavBar />
      <main className="flex-1 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {!isLoading && !isError && brief && (
            <TodayHero date={brief.date} topMission={topMission} />
          )}
          {isLoading && (
            <>
              <TodayHero date={null} topMission={null} />
              <MorningBriefSkeleton />
            </>
          )}

          {!isLoading && isError && (
            <>
              <TodayHero date={null} topMission={null} />
              <EmptyState icon={Sun} title="Brief not ready" description={BRIEF_UNAVAILABLE_MESSAGE} />
            </>
          )}

          {!isLoading && !isError && brief && (
            <>
              <TodayContent
                brief={brief}
                emptyMessage={emptyMessage}
                onSnooze={handleSnooze}
                onDone={handleDone}
                snoozePendingId={snooze.isPending ? snooze.variables : null}
                donePendingId={done.isPending ? done.variables : null}
              />
              <MissionProgressStrip cleared={progress.cleared} total={progress.total} />
              <MorningBriefHistoryPanel />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default TodayPage;
