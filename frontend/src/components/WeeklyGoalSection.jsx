/** Weekly application goal input and save section. */

import { useCallback, useState } from "react";

import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { Button } from "./ui/button";
import { Input } from "./ui/input";

const WEEKLY_GOAL_MIN = 1;
const WEEKLY_GOAL_MAX = 50;

function WeeklyGoalSection({ weeklyGoal, isGoalPending, onSaveGoal }) {
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
    <section className="rounded-xl bg-card border border-border p-6">
      <h2 className="font-display mb-1 text-base font-semibold text-foreground">
        Weekly Application Goal
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Set a target number of applications to submit per week. Shown as a progress ring on the dashboard.
      </p>
      {goalSaved && !isGoalPending && (
        <p role="alert" className="mb-4 rounded-lg bg-primary/10 border border-primary/20 px-3 py-3 text-sm text-primary">
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

export default WeeklyGoalSection;
