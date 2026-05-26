/** Weekly application goal — compact inline bar or expanded ring card. */

import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { cn } from "../lib/utils";

import Flame from "lucide-react/dist/esm/icons/flame";
import Target from "lucide-react/dist/esm/icons/target";

import { useApplicationStats } from "../hooks/useApplications";
import { useAuth } from "../context/AuthContext";

const RING_RADIUS = 36;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const INLINE_RING_RADIUS = 20;
const INLINE_RING_CIRCUMFERENCE = 2 * Math.PI * INLINE_RING_RADIUS;
const INLINE_RING_SIZE = INLINE_RING_RADIUS * 2 + 6;
const DEFAULT_WEEKLY_GOAL = 5;
const MINI_BAR_WIDTH_PX = 96;
const MINI_BAR_HEIGHT_PX = 4;

function ringColor(pct) {
  if (pct >= 1) return "stroke-brand-600";
  if (pct > 0) return "stroke-brand-600";
  return "stroke-border-2";
}

function GoalMiniBar({ pct }) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-sm bg-surface-2"
      style={{ width: MINI_BAR_WIDTH_PX, height: MINI_BAR_HEIGHT_PX }}
      aria-hidden="true"
    >
      <div
        className="h-full rounded-sm bg-brand-600 motion-reduce:transition-none transition-[width] duration-hover ease-out"
        style={{ width: `${Math.round(pct * 100)}%` }}
      />
    </div>
  );
}

function GoalProgressCompact({ appliedThisWeek, weeklyGoal, pct, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2" aria-hidden="true">
        <div className="h-3.5 w-28 animate-pulse rounded bg-surface-2" />
        <div className="h-1 w-24 animate-pulse rounded bg-surface-2" />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2" aria-label="Weekly goal progress">
      <span className="shrink-0 text-[0.8125rem] text-text-3">Goal:</span>
      <span className="shrink-0 text-[0.8125rem] font-medium text-text-1">
        {appliedThisWeek}/{weeklyGoal} this week
      </span>
      <GoalMiniBar pct={pct} />
    </div>
  );
}

function GoalProgressExpanded({ appliedThisWeek, weeklyGoal, currentStreak, pct, dashOffset, reducedMotion, isLoading }) {
  if (isLoading) {
    return (
      <div
        className="flex items-center gap-4 rounded-lg border border-border-1 p-4"
        aria-hidden="true"
      >
        <div className="h-20 w-20 animate-pulse rounded-full bg-surface-2" />
        <div className="flex flex-col gap-2">
          <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
          <div className="h-3 w-20 animate-pulse rounded bg-surface-2" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-4 rounded-lg border border-border-1 p-4"
      aria-label="Weekly goal progress"
    >
      <svg
        width={RING_RADIUS * 2 + 8}
        height={RING_RADIUS * 2 + 8}
        viewBox={`0 0 ${RING_RADIUS * 2 + 8} ${RING_RADIUS * 2 + 8}`}
        aria-hidden="true"
      >
        <circle
          cx={RING_RADIUS + 4}
          cy={RING_RADIUS + 4}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={6}
          className="stroke-surface-2"
        />
        <circle
          cx={RING_RADIUS + 4}
          cy={RING_RADIUS + 4}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${RING_RADIUS + 4} ${RING_RADIUS + 4})`}
          className={cn(ringColor(pct), !reducedMotion && "[transition:stroke-dashoffset_0.4s_ease]")}
        />
        <text
          x={RING_RADIUS + 4}
          y={RING_RADIUS + 4}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-text-1"
          fontSize={13}
          fontWeight={600}
        >
          {appliedThisWeek}
        </text>
      </svg>

      <div className="flex flex-col">
        <span className="text-sm font-medium text-text-1">
          {appliedThisWeek} / {weeklyGoal} this week
        </span>
        <span className="text-xs text-text-3">Weekly goal</span>
        <Link
          to="/settings?section=pipeline"
          className="mt-0.5 text-xs text-text-3 underline underline-offset-2 hover:text-text-1 motion-reduce:transition-none transition-colors duration-hover ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
        >
          Edit goal
        </Link>
        {currentStreak > 0 && (
          <span className="mt-1 flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-300">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            {currentStreak} week streak
          </span>
        )}
      </div>
    </div>
  );
}

function GoalProgressInline({ appliedThisWeek, weeklyGoal, currentStreak, pct, reducedMotion, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-4" aria-hidden="true">
        <div className="h-12 w-12 animate-pulse rounded-full bg-surface-2" />
        <div className="flex flex-col gap-1">
          <div className="h-7 w-16 animate-pulse rounded bg-surface-2" />
          <div className="h-4 w-20 animate-pulse rounded bg-surface-2" />
        </div>
      </div>
    );
  }

  const inlineDashOffset = INLINE_RING_CIRCUMFERENCE * (1 - pct);
  const center = INLINE_RING_SIZE / 2;

  return (
    <div className="flex items-center gap-3 p-4" aria-label={`Weekly goal: ${appliedThisWeek} of ${weeklyGoal}`}>
      <svg
        width={INLINE_RING_SIZE}
        height={INLINE_RING_SIZE}
        viewBox={`0 0 ${INLINE_RING_SIZE} ${INLINE_RING_SIZE}`}
        className="shrink-0"
        aria-hidden="true"
      >
        <circle cx={center} cy={center} r={INLINE_RING_RADIUS} fill="none" strokeWidth={4} className="stroke-surface-2" />
        <circle
          cx={center}
          cy={center}
          r={INLINE_RING_RADIUS}
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={INLINE_RING_CIRCUMFERENCE}
          strokeDashoffset={inlineDashOffset}
          transform={`rotate(-90 ${center} ${center})`}
          className={cn(ringColor(pct), !reducedMotion && "[transition:stroke-dashoffset_0.4s_ease]")}
        />
      </svg>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-2xl font-semibold leading-none text-text-1">
          {appliedThisWeek}
          <span className="text-text-3">/{weeklyGoal}</span>
        </span>
        <Link
          to="/settings?section=pipeline"
          className="inline-flex items-center gap-1.5 text-sm text-text-3 hover:text-text-1 motion-reduce:transition-none transition-colors duration-hover ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
        >
          <Target className="h-4 w-4 shrink-0" aria-hidden="true" />
          Weekly goal
        </Link>
        {currentStreak > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-300">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            {currentStreak}w streak
          </span>
        )}
      </div>
    </div>
  );
}

function GoalProgress({ variant = "expanded" }) {
  const { data: stats, isLoading } = useApplicationStats();
  const { user } = useAuth();
  const goalReachedRef = useRef(false);

  const weeklyGoal = user?.weekly_goal ?? DEFAULT_WEEKLY_GOAL;
  const appliedThisWeek = stats?.applied_this_week ?? 0;
  const currentStreak = stats?.current_streak ?? 0;
  const pct = weeklyGoal > 0 ? Math.min(appliedThisWeek / weeklyGoal, 1) : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - pct);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!isLoading && appliedThisWeek >= weeklyGoal && weeklyGoal > 0 && !goalReachedRef.current) {
      goalReachedRef.current = true;
      toast.success(`Goal reached! ${appliedThisWeek} applications this week.`);
    }
  }, [appliedThisWeek, weeklyGoal, isLoading]);

  if (variant === "compact") {
    return (
      <GoalProgressCompact
        appliedThisWeek={appliedThisWeek}
        weeklyGoal={weeklyGoal}
        pct={pct}
        isLoading={isLoading}
      />
    );
  }

  if (variant === "inline") {
    return (
      <GoalProgressInline
        appliedThisWeek={appliedThisWeek}
        weeklyGoal={weeklyGoal}
        currentStreak={currentStreak}
        pct={pct}
        reducedMotion={reducedMotion}
        isLoading={isLoading}
      />
    );
  }

  return (
    <GoalProgressExpanded
      appliedThisWeek={appliedThisWeek}
      weeklyGoal={weeklyGoal}
      currentStreak={currentStreak}
      pct={pct}
      dashOffset={dashOffset}
      reducedMotion={reducedMotion}
      isLoading={isLoading}
    />
  );
}

export default GoalProgress;
