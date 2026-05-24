/** Mission Control today page — prioritized missions with snooze/done actions. */

import { useCallback, useEffect } from "react";
import { Link } from "react-router-dom";

import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Check from "lucide-react/dist/esm/icons/check";
import Clock from "lucide-react/dist/esm/icons/clock";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Sun from "lucide-react/dist/esm/icons/sun";

import EmptyState from "../components/EmptyState";
import MissionCard from "../components/MissionCard";
import MissionPriorityPill from "../components/MissionPriorityPill";
import MissionProgressStrip from "../components/MissionProgressStrip";
import MorningBriefHistoryPanel from "../components/MorningBriefHistoryPanel";
import WeeklyReviewSection from "../components/WeeklyReviewSection";
import MorningBriefSkeleton from "../components/MorningBriefSkeleton";
import NavBar from "../components/NavBar";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { useMissionActions } from "../hooks/useMissionActions";
import { useMorningBrief } from "../hooks/useMorningBrief";
import { useWeeklyReview } from "../hooks/useWeeklyReview";
import {
  BRIEF_UNAVAILABLE_MESSAGE,
  DEFAULT_MORNING_BRIEF_HOUR,
  getBriefEmptyMessage,
  MISSION_HERO_PRIORITY,
} from "../lib/briefConstants";
import { TODAY_VISITED_KEY } from "../lib/constants";
import { CARD_BASE, BUTTON_GHOST, BUTTON_SECONDARY } from "../lib/designTokens";

function TodayHeroMission({ mission, onSnooze, onDone, isSnoozing, isCompleting }) {
  const busy = isSnoozing || isCompleting;

  return (
    <div
      className={`${CARD_BASE} animate-fade-in-up border-l-4 border-brand-500 bg-gradient-to-br from-brand-50/80 to-white p-5 dark:from-brand-950/40 dark:to-gray-800`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40"
            aria-hidden="true"
          >
            <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Mission #{MISSION_HERO_PRIORITY}
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-foreground">
              {mission.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{mission.reason}</p>
          </div>
        </div>
        <MissionPriorityPill priority={mission.priority} section={mission.section} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link to={mission.action_url} className="inline-flex items-center gap-1.5">
            Start mission
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
        <button
          type="button"
          onClick={() => onSnooze(mission.id)}
          disabled={busy}
          className={`${BUTTON_GHOST} inline-flex items-center gap-1.5 px-3 py-1.5 text-xs`}
        >
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Snooze
        </button>
        <button
          type="button"
          onClick={() => onDone(mission.id)}
          disabled={busy}
          className={`${BUTTON_SECONDARY} inline-flex items-center gap-1.5 px-3 py-1.5 text-xs`}
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Done
        </button>
      </div>
    </div>
  );
}

function TodayHero({ date, topMission, onSnooze, onDone, snoozePendingId, donePendingId }) {
  return (
    <header className="space-y-4 pb-2 animate-fade-in-up">
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
        <TodayHeroMission
          mission={topMission}
          onSnooze={onSnooze}
          onDone={onDone}
          isSnoozing={snoozePendingId === topMission.id}
          isCompleting={donePendingId === topMission.id}
        />
      )}
    </header>
  );
}

function TodayEmptyState({ description }) {
  return (
    <div className="animate-fade-in-up">
      <EmptyState
        icon={Sun}
        title="All caught up"
        description={description}
        svg={(
          <div
            className="mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 ring-4 ring-brand-100 dark:bg-brand-900/20 dark:ring-brand-900/40"
            aria-hidden="true"
          >
            <Sun className="h-10 w-10 text-brand-400 animate-pulse-soft" />
          </div>
        )}
      />
    </div>
  );
}

function TodayContent({ brief, emptyMessage, onSnooze, onDone, snoozePendingId, donePendingId }) {
  const missions = brief?.missions ?? [];
  const listMissions = missions.filter((m) => m.priority !== MISSION_HERO_PRIORITY);

  if (!missions.length) {
    return <TodayEmptyState description={brief?.summary_line ?? emptyMessage} />;
  }

  if (!listMissions.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Up next
      </p>
      {listMissions.map((mission, index) => (
        <div
          key={mission.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <MissionCard
            mission={mission}
            onSnooze={onSnooze}
            onDone={onDone}
            isSnoozing={snoozePendingId === mission.id}
            isCompleting={donePendingId === mission.id}
          />
        </div>
      ))}
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
  const topMission = brief?.missions?.find((m) => m.priority === MISSION_HERO_PRIORITY) ?? null;
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
            <TodayHero
              date={brief.date}
              topMission={topMission}
              onSnooze={handleSnooze}
              onDone={handleDone}
              snoozePendingId={snooze.isPending ? snooze.variables : null}
              donePendingId={done.isPending ? done.variables : null}
            />
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
              {weeklyReviewEnabled && (
                <WeeklyReviewSection review={weeklyReview} isLoading={isReviewLoading} />
              )}
              <MorningBriefHistoryPanel />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default TodayPage;
