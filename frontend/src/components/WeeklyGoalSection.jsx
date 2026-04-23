/** Weekly application goal input and save section. */

import { useCallback, useState } from "react";

import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { CARD_BASE, INPUT_BASE } from "../lib/designTokens";

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
    <section className={`${CARD_BASE} p-6`}>
      <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
        Weekly Application Goal
      </h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Set a target number of applications to submit per week. Shown as a progress ring on the dashboard.
      </p>
      {goalSaved && !isGoalPending && (
        <p role="alert" className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
          Weekly goal saved.
        </p>
      )}
      {goalError && (
        <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{goalError}</p>
      )}
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={WEEKLY_GOAL_MIN}
          max={WEEKLY_GOAL_MAX}
          value={localGoal}
          onChange={(e) => setLocalGoal(e.target.value)}
          aria-label="Weekly application goal"
          className={`${INPUT_BASE} w-24`}
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">applications / week</span>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSaveGoal}
          disabled={isGoalPending}
          className="flex items-center gap-2 rounded-button bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2"
        >
          {isGoalPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Save goal
        </button>
      </div>
    </section>
  );
}

export default WeeklyGoalSection;
