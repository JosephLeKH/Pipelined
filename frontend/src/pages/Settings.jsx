/** Settings page — pipeline stage configuration and user preferences. */

import { useState, useCallback, useRef } from "react";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import GripVertical from "lucide-react/dist/esm/icons/grip-vertical";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";

import NavBar from "../components/NavBar";
import SharePipeline from "../components/SharePipeline";
import TimezoneSelector from "../components/TimezoneSelector";
import { useAuth } from "../context/AuthContext";
import { useDeleteResume, useUpdateUser, useUploadResume } from "../hooks/useAuth";

const STAGE_NAME_MAX_LENGTH = 40;
const STAGES_MIN_COUNT = 2;
const STAGES_MAX_COUNT = 10;
const GENERIC_ERROR = "Failed to save stages. Please try again.";
const RESUME_ACCEPT = ".pdf";
const RESUME_MAX_MB = 2;
const WEEKLY_GOAL_MIN = 1;
const WEEKLY_GOAL_MAX = 50;
const DEFAULT_WEEKLY_GOAL = 5;

function SortableStageItem({ id, value, onRename, onRemove, canRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="cursor-grab text-gray-400 hover:text-gray-600 focus:outline-none dark:text-gray-500 dark:hover:text-gray-300"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <input
        type="text"
        value={value}
        maxLength={STAGE_NAME_MAX_LENGTH}
        onChange={(e) => onRename(id, e.target.value)}
        className="flex-1 rounded border-0 bg-transparent text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-gray-200"
        aria-label={`Stage name: ${value}`}
      />
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(id)}
          aria-label={`Remove stage ${value}`}
          className="text-gray-300 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 dark:text-gray-500 dark:hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function PipelineStagesEditor({ initialStages, onSave, isSaving, saveError }) {
  const [stages, setStages] = useState(() =>
    initialStages.map((name, i) => ({ id: `stage-${i}-${name}`, name }))
  );
  const [newStageName, setNewStageName] = useState("");
  const [localError, setLocalError] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStages((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const handleRename = useCallback((id, value) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, name: value } : s)));
  }, []);

  const handleRemove = useCallback((id) => {
    setStages((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleAdd = useCallback(() => {
    const trimmed = newStageName.trim();
    if (!trimmed) return;
    if (stages.length >= STAGES_MAX_COUNT) {
      setLocalError(`Maximum ${STAGES_MAX_COUNT} stages allowed.`);
      return;
    }
    setLocalError(null);
    setStages((prev) => [
      ...prev,
      { id: `stage-new-${Date.now()}`, name: trimmed },
    ]);
    setNewStageName("");
  }, [newStageName, stages.length]);

  const handleSave = useCallback(async () => {
    const names = stages.map((s) => s.name.trim()).filter(Boolean);
    if (names.length < STAGES_MIN_COUNT) {
      setLocalError(`At least ${STAGES_MIN_COUNT} stages are required.`);
      return;
    }
    if (names.length > STAGES_MAX_COUNT) {
      setLocalError(`Maximum ${STAGES_MAX_COUNT} stages allowed.`);
      return;
    }
    setLocalError(null);
    await onSave(names);
  }, [stages, onSave]);

  const errorMessage = localError ?? saveError;

  return (
    <div className="flex flex-col gap-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2" aria-label="Pipeline stages list">
            {stages.map((stage) => (
              <SortableStageItem
                key={stage.id}
                id={stage.id}
                value={stage.name}
                onRename={handleRename}
                onRemove={handleRemove}
                canRemove={stages.length > STAGES_MIN_COUNT}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {stages.length < STAGES_MAX_COUNT && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
            placeholder="New stage name"
            maxLength={STAGE_NAME_MAX_LENGTH}
            aria-label="New stage name"
            className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newStageName.trim()}
            aria-label="Add stage"
            className="flex items-center gap-1 rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      )}

      {errorMessage && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
        <p className="text-xs text-gray-400">
          {stages.length} / {STAGES_MAX_COUNT} stages
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Save stages
        </button>
      </div>
    </div>
  );
}

function Settings() {
  const { user } = useAuth();
  const { mutateAsync, isPending, error: mutationError } = useUpdateUser();
  const { mutateAsync: mutateTz, isPending: isTzPending, error: tzError } = useUpdateUser();
  const { mutateAsync: mutateDigest, isPending: isDigestPending } = useUpdateUser();
  const { mutateAsync: mutateGoal, isPending: isGoalPending } = useUpdateUser();
  const { mutate: uploadResume, isPending: isUploading } = useUploadResume();
  const { mutate: deleteResume, isPending: isDeleting } = useDeleteResume();
  const [resumeError, setResumeError] = useState(null);
  const [resumeSuccess, setResumeSuccess] = useState(false);
  const [savedStages, setSavedStages] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [timezone, setTimezone] = useState(
    () => user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/New_York"
  );
  const [tzSaved, setTzSaved] = useState(false);
  const [digestEnabled, setDigestEnabled] = useState(() => user?.digest_enabled ?? true);
  const [weeklyGoal, setWeeklyGoal] = useState(() => user?.weekly_goal ?? DEFAULT_WEEKLY_GOAL);
  const [goalSaved, setGoalSaved] = useState(false);
  const [goalError, setGoalError] = useState(null);

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

  const handleResumeUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeError(null);
    setResumeSuccess(false);
    if (file.size > RESUME_MAX_MB * 1024 * 1024) {
      setResumeError(`File must be ${RESUME_MAX_MB} MB or smaller.`);
      return;
    }
    uploadResume(file, {
      onSuccess: () => setResumeSuccess(true),
      onError: (err) => setResumeError(err?.message ?? "Upload failed. Please try again."),
    });
    // Reset input so the same file can be re-selected after removal
    e.target.value = "";
  }, [uploadResume]);

  const handleResumeDelete = useCallback(() => {
    setResumeError(null);
    setResumeSuccess(false);
    deleteResume(undefined, {
      onError: (err) => setResumeError(err?.message ?? "Failed to remove resume."),
    });
  }, [deleteResume]);

  const handleDigestToggle = useCallback(async (enabled) => {
    setDigestEnabled(enabled);
    try { await mutateDigest({ digest_enabled: enabled }); } catch { setDigestEnabled(!enabled); }
  }, [mutateDigest]);

  const handleSaveGoal = useCallback(async () => {
    const val = Number(weeklyGoal);
    if (!Number.isInteger(val) || val < WEEKLY_GOAL_MIN || val > WEEKLY_GOAL_MAX) {
      setGoalError(`Goal must be between ${WEEKLY_GOAL_MIN} and ${WEEKLY_GOAL_MAX}.`);
      return;
    }
    setGoalError(null);
    setGoalSaved(false);
    try { await mutateGoal({ weekly_goal: val }); setGoalSaved(true); } catch {
      setGoalError("Failed to save goal. Please try again.");
    }
  }, [weeklyGoal, mutateGoal]);

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

        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
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
              value={weeklyGoal}
              onChange={(e) => setWeeklyGoal(e.target.value)}
              aria-label="Weekly application goal"
              className="w-24 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">applications / week</span>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSaveGoal}
              disabled={isGoalPending}
              className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isGoalPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Save goal
            </button>
          </div>
        </section>

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

        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
            Resume
          </h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Upload your resume (PDF, max {RESUME_MAX_MB} MB) to enable AI fit scoring on new applications.
          </p>
          {resumeSuccess && (
            <p role="alert" className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
              Resume uploaded successfully.
            </p>
          )}
          {resumeError && (
            <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{resumeError}</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 disabled:opacity-60">
              {isUploading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {user?.has_resume ? "Replace resume" : "Upload resume"}
              <input
                type="file"
                accept={RESUME_ACCEPT}
                className="sr-only"
                onChange={handleResumeUpload}
                disabled={isUploading || isDeleting}
                aria-label="Upload resume PDF"
              />
            </label>
            {user?.has_resume && (
              <button
                type="button"
                onClick={handleResumeDelete}
                disabled={isUploading || isDeleting}
                className="flex items-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Remove resume
              </button>
            )}
          </div>
          {user?.has_resume && !resumeSuccess && (
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              A resume is currently on file. New applications will be scored automatically.
            </p>
          )}
        </section>

        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
            Weekly digest email
          </h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Receive a weekly summary of your job search activity every Monday morning.
          </p>
          <label className="flex cursor-pointer items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={digestEnabled}
              aria-label="Weekly digest email"
              disabled={isDigestPending}
              onClick={() => handleDigestToggle(!digestEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 ${digestEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${digestEnabled ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {digestEnabled ? "Enabled" : "Disabled"}
            </span>
          </label>
        </section>
      </main>
    </div>
  );
}

export default Settings;
