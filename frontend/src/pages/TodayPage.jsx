/** Mission Control today page — prioritized missions with snooze/done actions. */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Sun from "lucide-react/dist/esm/icons/sun";

import MorningBriefSkeleton from "../components/MorningBriefSkeleton";
import OnboardingChecklist from "../components/OnboardingChecklist";
import QuickTourBanner from "../components/QuickTourBanner";
import TodayFollowUps from "../components/TodayFollowUps";
import TodayMorningBrief from "../components/TodayMorningBrief";
import TodayMissionsList from "../components/TodayMissionsList";
import WeeklyGoalSection from "../components/WeeklyGoalSection";
import WeeklyReviewSection, { WeeklyReviewTeaser } from "../components/WeeklyReviewSection";
import { useAuth } from "../context/AuthContext";
import { useApplicationStats } from "../hooks/useApplications";
import { useMissionActions } from "../hooks/useMissionActions";
import { useMorningBrief, useGenerateBrief } from "../hooks/useMorningBrief";
import { useWeeklyReview } from "../hooks/useWeeklyReview";
import {
  BRIEF_UNAVAILABLE_MESSAGE,
  DEFAULT_MORNING_BRIEF_HOUR,
  getBriefEmptyMessage,
} from "../lib/briefConstants";
import { TODAY_VISITED_KEY } from "../lib/constants";
import { formatTodayDateRow, formatTodayGreeting, isSundayInTimezone } from "../lib/todayUtils";

function TodayGreeting({ user, briefDate, missionCount }) {
  const timezone = user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dateRow = formatTodayDateRow(briefDate, missionCount, timezone);

  return (
    <header className="pb-6 pt-8">
      <p className="text-xs font-medium uppercase tracking-wider text-text-3">
        {dateRow}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-1">
        {formatTodayGreeting(user, briefDate)}
      </h1>
    </header>
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

function TodayEmptyBriefState({ user, briefHour, emptyMessage, generateBrief, isGenerating, generateError }) {
  return (
    <>
      <TodayGreeting user={user} briefDate={null} missionCount={0} />
      <TodayFollowUps />
      <TodayMorningBrief
        brief={null}
        briefHour={briefHour}
        emptyMessage={emptyMessage}
        forceOpen
        onGenerateBrief={() => generateBrief.mutate()}
        isGenerating={isGenerating}
        generateError={generateError}
      />
    </>
  );
}

function TodayWeeklyReviewArea({ weeklyReviewEnabled, isSunday, weeklyReview, isReviewLoading, reviewError }) {
  const [weeklyReviewOpen, setWeeklyReviewOpen] = useState(false);

  if (!weeklyReviewEnabled || !isSunday) return null;

  return weeklyReviewOpen ? (
    <WeeklyReviewSection review={weeklyReview} isLoading={isReviewLoading} error={reviewError} />
  ) : (
    <WeeklyReviewTeaser
      review={weeklyReview}
      isLoading={isReviewLoading}
      onReadReview={() => setWeeklyReviewOpen(true)}
    />
  );
}

function TodayLoadedContent({
  user,
  brief,
  missions,
  progress,
  appliedThisWeek,
  weeklyGoal,
  timezone,
  briefHour,
  emptyMessage,
  forceBriefOpen,
  generateBrief,
  isGenerating,
  generateError,
  handleSnooze,
  handleDone,
  snoozeIsPending,
  snoozeVariables,
  doneIsPending,
  doneVariables,
  weeklyReviewEnabled,
  isSunday,
  weeklyReview,
  isReviewLoading,
  reviewError,
}) {
  return (
    <>
      <TodayGreeting user={user} briefDate={brief.date} missionCount={missions.length} />
      <WeeklyGoalSection
        compact
        appliedThisWeek={appliedThisWeek}
        weeklyGoal={weeklyGoal}
        timezone={timezone}
      />
      <OnboardingChecklist />
      <TodayMissionsList
        missions={missions}
        briefDate={brief.date}
        clearedCount={progress.cleared}
        onSnooze={handleSnooze}
        onDone={handleDone}
        snoozePendingId={snoozeIsPending ? snoozeVariables : null}
        donePendingId={doneIsPending ? doneVariables : null}
      />
      <TodayMorningBrief
        brief={brief}
        briefHour={briefHour}
        emptyMessage={emptyMessage}
        forceOpen={forceBriefOpen}
        onGenerateBrief={() => generateBrief.mutate()}
        isGenerating={isGenerating}
        generateError={generateError}
      />
      <TodayWeeklyReviewArea
        weeklyReviewEnabled={weeklyReviewEnabled}
        isSunday={isSunday}
        weeklyReview={weeklyReview}
        isReviewLoading={isReviewLoading}
        reviewError={reviewError}
      />
    </>
  );
}

function TodayPage() {
  useEffect(() => {
    localStorage.setItem(TODAY_VISITED_KEY, "true");
  }, []);

  const [searchParams] = useSearchParams();
  const forceBriefOpen = searchParams.get("brief") === "open";

  const { user } = useAuth();
  const { data: brief, isLoading, isError } = useMorningBrief();
  const { data: stats } = useApplicationStats();
  const weeklyReviewEnabled = user?.weekly_review_enabled !== false;
  const { data: weeklyReview, isLoading: isReviewLoading, error: reviewError } = useWeeklyReview({
    enabled: weeklyReviewEnabled,
  });
  const { snooze, done } = useMissionActions();
  const generateBrief = useGenerateBrief();
  const briefHour = user?.morning_brief_hour ?? DEFAULT_MORNING_BRIEF_HOUR;
  const emptyMessage = getBriefEmptyMessage(briefHour);
  const missions = brief?.missions ?? [];
  const progress = brief?.mission_progress ?? { cleared: 0, total: 0 };
  const weeklyGoal = user?.weekly_goal ?? 0;
  const appliedThisWeek = stats?.applied_this_week ?? 0;
  const timezone = user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const isSunday = isSundayInTimezone(timezone);

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
        <QuickTourBanner />
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

        {!isLoading && !isError && !brief && (
          <TodayEmptyBriefState
            user={user}
            briefHour={briefHour}
            emptyMessage={emptyMessage}
            generateBrief={generateBrief}
            isGenerating={generateBrief.isPending}
            generateError={generateBrief.error}
          />
        )}

        {!isLoading && !isError && brief && (
          <TodayLoadedContent
            user={user}
            brief={brief}
            missions={missions}
            progress={progress}
            appliedThisWeek={appliedThisWeek}
            weeklyGoal={weeklyGoal}
            timezone={timezone}
            briefHour={briefHour}
            emptyMessage={emptyMessage}
            forceBriefOpen={forceBriefOpen}
            generateBrief={generateBrief}
            isGenerating={generateBrief.isPending}
            generateError={generateBrief.error}
            handleSnooze={handleSnooze}
            handleDone={handleDone}
            snoozeIsPending={snooze.isPending}
            snoozeVariables={snooze.variables}
            doneIsPending={done.isPending}
            doneVariables={done.variables}
            weeklyReviewEnabled={weeklyReviewEnabled}
            isSunday={isSunday}
            weeklyReview={weeklyReview}
            isReviewLoading={isReviewLoading}
            reviewError={reviewError}
          />
        )}
      </div>
    </main>
  );
}

export default TodayPage;
