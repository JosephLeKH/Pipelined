/** Settings pipeline section — stage editor, weekly goal, and streak display. */

import { useState, useCallback } from "react";

import Flame from "lucide-react/dist/esm/icons/flame";

import PipelineStagesEditor from "./PipelineStagesEditor";
import SettingsPageShell from "./SettingsPageShell";
import WeeklyGoalSection from "./WeeklyGoalSection";
import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";
import { COPY_RESET_MS } from "../lib/constants";

const GENERIC_ERROR = "Failed to save stages. Please try again.";
const DEFAULT_WEEKLY_GOAL = 5;

function SettingsPipelineSection() {
  const { user } = useAuth();
  const { mutateAsync, isPending, error: mutationError } = useUpdateUser();
  const { mutateAsync: mutateGoal, isPending: isGoalPending } = useUpdateUser();

  const [savedStages, setSavedStages] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [savedAck, setSavedAck] = useState(false);
  const [cancelSignal, setCancelSignal] = useState(0);
  const [saveSignal, setSaveSignal] = useState(0);
  const [weeklyGoal, setWeeklyGoal] = useState(() => user?.weekly_goal ?? DEFAULT_WEEKLY_GOAL);

  const handleSave = useCallback(
    async (stages) => {
      setSavedAck(false);
      try {
        const data = await mutateAsync({ default_stages: stages });
        setSavedStages(data?.default_stages ?? stages);
        setSavedAck(true);
        window.setTimeout(() => setSavedAck(false), COPY_RESET_MS);
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

  const handleShellSave = useCallback(() => {
    setSaveSignal((count) => count + 1);
  }, []);

  const handleShellCancel = useCallback(() => {
    setCancelSignal((count) => count + 1);
  }, []);

  const currentStages = savedStages ?? user?.default_stages ?? [];
  const saveError = mutationError ? (mutationError.message ?? GENERIC_ERROR) : null;
  const streak = user?.weekly_streak ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <SettingsPageShell
        title="Pipeline stages"
        subtitle="Customize the stages for your job search pipeline. Drag to reorder."
        dirty={dirty}
        isSaving={isPending}
        savedAck={savedAck}
        onSave={handleShellSave}
        onCancel={handleShellCancel}
        error={saveError}
      >
        {currentStages.length > 0 ? (
          <PipelineStagesEditor
            key={currentStages.join(",")}
            initialStages={currentStages}
            onSave={handleSave}
            isSaving={isPending}
            saveError={null}
            onDirtyChange={setDirty}
            onCancelRequest={cancelSignal}
            saveSignal={saveSignal}
          />
        ) : null}
      </SettingsPageShell>

      <WeeklyGoalSection
        weeklyGoal={weeklyGoal}
        isGoalPending={isGoalPending}
        onSaveGoal={handleSaveGoal}
      />

      {streak > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-border-1 bg-surface-0 px-5 py-4">
          <Flame className="h-5 w-5 text-status-warn" aria-hidden="true" />
          <span className="text-sm font-medium text-text-1">{streak}-week streak</span>
          <span className="text-xs text-text-3">Keep it up!</span>
        </div>
      ) : null}
    </div>
  );
}

export default SettingsPipelineSection;
