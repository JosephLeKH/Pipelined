/** Settings pipeline section — stage editor, weekly goal, and streak display. */

import { useState, useCallback } from "react";

import Flame from "lucide-react/dist/esm/icons/flame";

import PipelineStagesEditor from "./PipelineStagesEditor";
import WeeklyGoalSection from "./WeeklyGoalSection";
import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";

const GENERIC_ERROR = "Failed to save stages. Please try again.";
const DEFAULT_WEEKLY_GOAL = 5;

function SettingsPipelineSection() {
  const { user } = useAuth();
  const { mutateAsync, isPending, error: mutationError } = useUpdateUser();
  const { mutateAsync: mutateGoal, isPending: isGoalPending } = useUpdateUser();

  const [savedStages, setSavedStages] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState(() => user?.weekly_goal ?? DEFAULT_WEEKLY_GOAL);

  const handleSave = useCallback(
    async (stages) => {
      setSaveSuccess(false);
      try {
        const data = await mutateAsync({ default_stages: stages });
        setSavedStages(data?.default_stages ?? stages);
        setSaveSuccess(true);
      } catch {
        // error surfaced via mutationError
      }
    },
    [mutateAsync]
  );

  const handleSaveGoal = useCallback(
    async (val) => {
      setWeeklyGoal(val);
      await mutateGoal({ weekly_goal: val });
    },
    [mutateGoal]
  );

  const currentStages = savedStages ?? user?.default_stages ?? [];
  const saveError = mutationError ? (mutationError.message ?? GENERIC_ERROR) : null;
  const streak = user?.weekly_streak ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-card border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Pipeline Stages
        </h2>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          Customize the stages for your job search pipeline. Drag to reorder.
        </p>

        {saveSuccess && !isPending && (
          <p role="alert" className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
            Stages saved successfully.
          </p>
        )}

        {currentStages.length > 0 && (
          <PipelineStagesEditor
            key={currentStages.join(",")}
            initialStages={currentStages}
            onSave={handleSave}
            isSaving={isPending}
            saveError={saveError}
          />
        )}
      </section>

      <WeeklyGoalSection
        weeklyGoal={weeklyGoal}
        isGoalPending={isGoalPending}
        onSaveGoal={handleSaveGoal}
      />

      {streak > 0 && (
        <div className="flex items-center gap-2 rounded-card border border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800">
          <Flame className="h-5 w-5 text-amber-500" aria-hidden="true" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {streak}-week streak
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">Keep it up!</span>
        </div>
      )}
    </div>
  );
}

export default SettingsPipelineSection;
