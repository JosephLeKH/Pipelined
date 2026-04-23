/** Settings pipeline section — stage editor, weekly goal, and streak display. */

import { useState, useCallback } from "react";

import Flame from "lucide-react/dist/esm/icons/flame";

import PipelineStagesEditor from "./PipelineStagesEditor";
import WeeklyGoalSection from "./WeeklyGoalSection";
import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";
import { CARD_BASE, SUCCESS_BANNER } from "../lib/designTokens";

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
      <section className={`${CARD_BASE} p-6`}>
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Pipeline Stages
        </h2>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Customize the stages for your job search pipeline. Drag to reorder.
        </p>

        {saveSuccess && !isPending && (
          <p role="alert" className={`mb-4 ${SUCCESS_BANNER}`}>
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
        <div className={`flex items-center gap-2 ${CARD_BASE} px-5 py-4`}>
          <Flame className="h-5 w-5 text-amber-500" aria-hidden="true" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {streak}-week streak
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">Keep it up!</span>
        </div>
      )}
    </div>
  );
}

export default SettingsPipelineSection;
