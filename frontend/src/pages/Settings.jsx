/** Settings page — pipeline stage configuration and user preferences. */

import { useState, useCallback } from "react";

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
import TimezoneSelector from "../components/TimezoneSelector";
import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";

const STAGE_NAME_MAX_LENGTH = 40;
const STAGES_MIN_COUNT = 2;
const STAGES_MAX_COUNT = 10;
const GENERIC_ERROR = "Failed to save stages. Please try again.";

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
  const [savedStages, setSavedStages] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [timezone, setTimezone] = useState(
    () => user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/New_York"
  );
  const [tzSaved, setTzSaved] = useState(false);

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
      </main>
    </div>
  );
}

export default Settings;
