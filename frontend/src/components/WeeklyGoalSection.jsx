/** Weekly application goal — compact Today bar or full settings form. */

import { useCallback, useState } from "react";
import { Link } from "react-router-dom";

import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { formatDaysLeftInWeek } from "../lib/todayUtils";

const WEEKLY_GOAL_MIN = 1;
const WEEKLY_GOAL_MAX = 50;
const COMPACT_BAR_WIDTH_PX = 200;

function WeeklyGoalCompactBar({ pct }) {
  return (
    <div
      className="h-1.5 shrink-0 overflow-hidden rounded-full bg-surface-2"
      style={{ width: COMPACT_BAR_WIDTH_PX }}
      role="progressbar"
      aria-valuenow={Math.round(pct * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={[
          "h-full rounded-full bg-brand-600",
          "motion-safe:transition-[width] motion-safe:duration-200",
        ].join(" ")}
        style={{ width: `${Math.round(pct * 100)}%` }}
      />
    </div>
  );
}

function WeeklyGoalCompact({ appliedThisWeek, weeklyGoal, timezone }) {
  const hasGoal = weeklyGoal > 0;
  const pct = hasGoal ? Math.min(appliedThisWeek / weeklyGoal, 1) : 0;
  const daysLabel = formatDaysLeftInWeek(new Date(), timezone);

  return (
    <section
      className="flex min-h-16 items-center gap-4 rounded-lg border border-border-1 bg-surface-1 p-4"
      aria-label="Weekly application goal"
    >
      <div className="min-w-0 flex-1">
        {hasGoal ? (
          <p className="text-sm text-text-1">
            {appliedThisWeek} / {weeklyGoal} applications this week
          </p>
        ) : (
          <p className="text-sm text-text-3">{daysLabel} · Set a weekly target</p>
        )}
        {hasGoal && <p className="mt-1 text-xs text-text-3">{daysLabel}</p>}
      </div>
      {hasGoal ? (
        <WeeklyGoalCompactBar pct={pct} />
      ) : (
        <Link
          to="/settings?section=pipeline"
          className={[
            "shrink-0 text-sm text-brand-600 hover:underline",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600",
            "dark:focus-visible:outline-1",
          ].join(" ")}
        >
          Set goal
        </Link>
      )}
    </section>
  );
}

function WeeklyGoalSettingsForm({ weeklyGoal, isGoalPending, onSaveGoal }) {
  const [localGoal, setLocalGoal] = useState(String(weeklyGoal));
  const [goalError, setGoalError] = useState(null);
  const [goalSaved, setGoalSaved] = useState(false);

  const handleSaveGoal = useCallback(async () => {
    const val = Number(localGoal);
    if (!Number.isInteger(val) || val < WEEKLY_GOAL_MIN || val > WEEKLY_GOAL_MAX) {
      setGoalError(`Goal must be between ${WEEKLY_GOAL_MIN} and ${WEEKLY_GOAL_MAX}.`);
      return;
    }
    setGoalError(null);
    setGoalSaved(false);
    try {
      await onSaveGoal(val);
      setGoalSaved(true);
    } catch {
      setGoalError("Failed to save goal. Please try again.");
    }
  }, [localGoal, onSaveGoal]);

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-1 text-base font-semibold text-foreground">
        Weekly Application Goal
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Set a target number of applications to submit per week. Shown as a progress ring on the dashboard.
      </p>
      {goalSaved && !isGoalPending && (
        <p role="alert" className="mb-4 rounded-lg border border-primary/20 bg-primary/10 px-3 py-3 text-sm text-primary">
          Weekly goal saved.
        </p>
      )}
      {goalError && (
        <p id="goal-error" role="alert" className="mb-4 text-sm text-destructive">{goalError}</p>
      )}
      <div className="flex items-center gap-3">
        <Input
          type="number"
          min={WEEKLY_GOAL_MIN}
          max={WEEKLY_GOAL_MAX}
          value={localGoal}
          onChange={(e) => setLocalGoal(e.target.value)}
          aria-label="Weekly application goal"
          aria-describedby={goalError ? "goal-error" : undefined}
          className="w-24"
        />
        <span className="text-sm text-muted-foreground">applications / week</span>
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="button" onClick={handleSaveGoal} disabled={isGoalPending} className="flex items-center gap-2">
          {isGoalPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Save goal
        </Button>
      </div>
    </section>
  );
}

function WeeklyGoalSection({
  compact = false,
  appliedThisWeek = 0,
  weeklyGoal = 0,
  timezone,
  isGoalPending,
  onSaveGoal,
}) {
  if (compact) {
    return (
      <WeeklyGoalCompact
        appliedThisWeek={appliedThisWeek}
        weeklyGoal={weeklyGoal}
        timezone={timezone}
      />
    );
  }

  return (
    <WeeklyGoalSettingsForm
      weeklyGoal={weeklyGoal}
      isGoalPending={isGoalPending}
      onSaveGoal={onSaveGoal}
    />
  );
}

export default WeeklyGoalSection;
