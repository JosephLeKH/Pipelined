/** Settings page — pipeline stage configuration and user preferences. */

import { useState, useCallback } from "react";

import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import NavBar from "../components/NavBar";
import PipelineStagesEditor from "../components/PipelineStagesEditor";
import WeeklyGoalSection from "../components/WeeklyGoalSection";
import ResumeSection from "../components/ResumeSection";
import DigestSection from "../components/DigestSection";
import SharePipeline from "../components/SharePipeline";
import TimezoneSelector from "../components/TimezoneSelector";
import { useAuth } from "../context/AuthContext";
import { useDeleteResume, useUpdateUser, useUploadResume } from "../hooks/useAuth";

const GENERIC_ERROR = "Failed to save stages. Please try again.";
const DEFAULT_WEEKLY_GOAL = 5;

function Settings() {
  const { user } = useAuth();
  const { mutateAsync, isPending, error: mutationError } = useUpdateUser();
  const { mutateAsync: mutateTz, isPending: isTzPending, error: tzError } = useUpdateUser();
  const { mutateAsync: mutateDigest, isPending: isDigestPending } = useUpdateUser();
  const { mutateAsync: mutateGoal, isPending: isGoalPending } = useUpdateUser();
  const { mutate: uploadResume, isPending: isUploading } = useUploadResume();
  const { mutate: deleteResume, isPending: isDeleting } = useDeleteResume();

  const [savedStages, setSavedStages] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [timezone, setTimezone] = useState(
    () => user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/New_York"
  );
  const [tzSaved, setTzSaved] = useState(false);
  const [digestEnabled, setDigestEnabled] = useState(() => user?.digest_enabled ?? true);
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

  const handleSaveTz = useCallback(async () => {
    setTzSaved(false);
    try { await mutateTz({ timezone }); setTzSaved(true); } catch { /* tzError surfaced */ }
  }, [timezone, mutateTz]);

  const handleDigestToggle = useCallback(async (enabled) => {
    setDigestEnabled(enabled);
    try { await mutateDigest({ digest_enabled: enabled }); } catch { setDigestEnabled(!enabled); }
  }, [mutateDigest]);

  const handleSaveGoal = useCallback(
    async (val) => {
      setWeeklyGoal(val);
      await mutateGoal({ weekly_goal: val });
    },
    [mutateGoal]
  );

  const currentStages = savedStages ?? user?.default_stages ?? [];
  const saveError = mutationError ? (mutationError.message ?? GENERIC_ERROR) : null;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <NavBar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>

        <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
            Pipeline Stages
          </h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
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

        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
            Timezone
          </h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Calendar events will display times in this timezone.
          </p>
          {tzSaved && !isTzPending && (
            <p role="alert" className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
              Timezone saved.
            </p>
          )}
          {tzError && (
            <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
              {tzError.message ?? GENERIC_ERROR}
            </p>
          )}
          <TimezoneSelector value={timezone} onChange={setTimezone} />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSaveTz}
              disabled={isTzPending}
              className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isTzPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Save timezone
            </button>
          </div>
        </section>

        <div className="mt-6">
          <SharePipeline />
        </div>

        <ResumeSection
          hasResume={user?.has_resume}
          isUploading={isUploading}
          isDeleting={isDeleting}
          onResumeUpload={uploadResume}
          onResumeDelete={deleteResume}
        />

        <DigestSection
          digestEnabled={digestEnabled}
          isDigestPending={isDigestPending}
          onDigestToggle={handleDigestToggle}
        />
      </main>
    </div>
  );
}

export default Settings;
