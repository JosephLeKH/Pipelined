/** Circular progress ring showing weekly application goal and streak count. */

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import Flame from "lucide-react/dist/esm/icons/flame";

import { useApplicationStats } from "../hooks/useApplications";
import { useAuth } from "../context/AuthContext";

const RING_RADIUS = 36;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const DEFAULT_WEEKLY_GOAL = 5;

function ringColor(pct) {
  if (pct >= 1) return "stroke-green-500";
  if (pct > 0) return "stroke-primary";
  return "stroke-muted-foreground/30";
}

function GoalProgress() {
  const { data: stats, isLoading } = useApplicationStats();
  const { user } = useAuth();
  const goalReachedRef = useRef(false);

  const weeklyGoal = user?.weekly_goal ?? DEFAULT_WEEKLY_GOAL;
  const appliedThisWeek = stats?.applied_this_week ?? 0;
  const currentStreak = stats?.current_streak ?? 0;
  const pct = weeklyGoal > 0 ? Math.min(appliedThisWeek / weeklyGoal, 1) : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - pct);

  useEffect(() => {
    if (!isLoading && appliedThisWeek >= weeklyGoal && weeklyGoal > 0 && !goalReachedRef.current) {
      goalReachedRef.current = true;
      toast.success(`Goal reached! ${appliedThisWeek} applications this week.`);
    }
  }, [appliedThisWeek, weeklyGoal, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
        <div className="h-20 w-20 animate-pulse rounded-full bg-muted" />
        <div className="flex flex-col gap-2">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border" aria-label="Weekly goal progress">
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
          className="stroke-muted"
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
          className={ringColor(pct)}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
        <text
          x={RING_RADIUS + 4}
          y={RING_RADIUS + 4}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground"
          fontSize={13}
          fontWeight={600}
        >
          {appliedThisWeek}
        </text>
      </svg>

      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">
          {appliedThisWeek} / {weeklyGoal} this week
        </span>
        <span className="text-xs text-muted-foreground">Weekly goal</span>
        {currentStreak > 0 && (
          <span className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            {currentStreak} week streak
          </span>
        )}
      </div>
    </div>
  );
}

export default GoalProgress;
