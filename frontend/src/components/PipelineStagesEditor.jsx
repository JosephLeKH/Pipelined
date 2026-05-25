/** Pipeline stages editor with drag-to-reorder UI and validation. */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";

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

import Plus from "lucide-react/dist/esm/icons/plus";

import {
  REQUIRED_PIPELINE_STAGES,
  STAGE_COLOR_PICKER_OPTIONS,
} from "../lib/constants";
import {
  persistStageColorOverrides,
  readStageColorOverrides,
  resolveStageDotColor,
  resolveStagePickerKey,
} from "../lib/stageColorPrefs";
import PipelineStageRow from "./PipelineStageRow";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const STAGE_NAME_MAX_LENGTH = 40;
const STAGES_MIN_COUNT = 2;
const STAGES_MAX_COUNT = 10;
const REQUIRED_STAGE_SET = new Set(REQUIRED_PIPELINE_STAGES);

function stageNamesEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((name, index) => name === b[index]);
}

function colorOverridesEqual(a, b) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every((key) => a[key] === b[key]);
}

function buildStageItems(names, colorOverrides) {
  return names.map((name, index) => ({
    id: `stage-${index}-${name}`,
    name,
    colorKey: resolveStagePickerKey(name, colorOverrides),
  }));
}

function useStagesEditor(initialStages, onDirtyChange) {
  const [baselineNames, setBaselineNames] = useState(() => [...initialStages]);
  const [baselineColors, setBaselineColors] = useState(() => readStageColorOverrides());
  const [colorOverrides, setColorOverrides] = useState(() => readStageColorOverrides());
  const [stages, setStages] = useState(() => buildStageItems(initialStages, readStageColorOverrides()));
  const [newStageName, setNewStageName] = useState("");
  const [localError, setLocalError] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const currentNames = useMemo(() => stages.map((stage) => stage.name), [stages]);
  const dirty = !stageNamesEqual(currentNames, baselineNames) || !colorOverridesEqual(colorOverrides, baselineColors);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    setStages((prev) =>
      arrayMove(
        prev,
        prev.findIndex((stage) => stage.id === active.id),
        prev.findIndex((stage) => stage.id === over.id)
      )
    );
  }, []);

  const handleRename = useCallback((id, value) => {
    setStages((prev) => prev.map((stage) => (stage.id === id ? { ...stage, name: value } : stage)));
  }, []);

  const handleColorChange = useCallback((id, colorKey) => {
    setStages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        setColorOverrides((overrides) => {
          const next = { ...overrides, [target.name]: colorKey };
          persistStageColorOverrides(next);
          return next;
        });
      }
      return prev.map((stage) => (stage.id === id ? { ...stage, colorKey } : stage));
    });
  }, []);

  const handleRemove = useCallback((id) => {
    setStages((prev) => prev.filter((stage) => stage.id !== id));
  }, []);

  const handleAdd = useCallback(() => {
    const trimmed = newStageName.trim();
    if (!trimmed) {
      return;
    }
    if (stages.length >= STAGES_MAX_COUNT) {
      setLocalError(`Maximum ${STAGES_MAX_COUNT} stages allowed.`);
      return;
    }
    setLocalError(null);
    setStages((prev) => [
      ...prev,
      { id: `stage-new-${Date.now()}`, name: trimmed, colorKey: "neutral" },
    ]);
    setNewStageName("");
  }, [newStageName, stages.length]);

  const resetToBaseline = useCallback(() => {
    setStages(buildStageItems(baselineNames, baselineColors));
    setColorOverrides({ ...baselineColors });
    persistStageColorOverrides(baselineColors);
    setLocalError(null);
    setNewStageName("");
  }, [baselineColors, baselineNames]);

  const commitBaseline = useCallback((names) => {
    setBaselineNames([...names]);
    setBaselineColors({ ...colorOverrides });
  }, [colorOverrides]);

  return {
    stages,
    sensors,
    newStageName,
    setNewStageName,
    localError,
    setLocalError,
    colorOverrides,
    handleDragEnd,
    handleRename,
    handleColorChange,
    handleRemove,
    handleAdd,
    resetToBaseline,
    commitBaseline,
  };
}

function dotColorForStage(stage) {
  return STAGE_COLOR_PICKER_OPTIONS.find((option) => option.key === stage.colorKey)?.hex
    ?? resolveStageDotColor(stage.name);
}

function SortablePipelineStageRow({ stage, canRemove, onRename, onColorChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
  });

  return (
    <PipelineStageRow
      id={stage.id}
      name={stage.name}
      dotColor={dotColorForStage(stage)}
      colorKey={stage.colorKey}
      onRename={onRename}
      onColorChange={onColorChange}
      onRemove={onRemove}
      canRemove={canRemove}
      dragAttributes={attributes}
      dragListeners={listeners}
      setNodeRef={setNodeRef}
      transformStyle={CSS.Transform.toString(transform)}
      transitionStyle={transition}
      isDragging={isDragging}
    />
  );
}

function AddStageInput({ newStageName, onNameChange, onAdd }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        value={newStageName}
        onChange={(e) => onNameChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd();
          }
        }}
        placeholder="New stage name"
        maxLength={STAGE_NAME_MAX_LENGTH}
        aria-label="New stage name"
        className="flex-1"
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onAdd}
        disabled={!newStageName.trim()}
        aria-label="Add stage"
      >
        <Plus className="h-4 w-4" />
        Add stage
      </Button>
    </div>
  );
}

function PipelineStagesEditor({
  initialStages,
  onSave,
  isSaving,
  saveError,
  onDirtyChange,
  onCancelRequest,
  saveSignal,
}) {
  const {
    stages,
    sensors,
    newStageName,
    setNewStageName,
    localError,
    setLocalError,
    handleDragEnd,
    handleRename,
    handleColorChange,
    handleRemove,
    handleAdd,
    resetToBaseline,
    commitBaseline,
  } = useStagesEditor(initialStages, onDirtyChange);

  const performSave = useCallback(async () => {
    const names = stages.map((stage) => stage.name.trim()).filter(Boolean);
    if (names.length < STAGES_MIN_COUNT) {
      setLocalError(`At least ${STAGES_MIN_COUNT} stages are required.`);
      return;
    }
    if (names.length > STAGES_MAX_COUNT) {
      setLocalError(`Maximum ${STAGES_MAX_COUNT} stages allowed.`);
      return;
    }
    for (const required of REQUIRED_PIPELINE_STAGES) {
      if (!names.includes(required)) {
        setLocalError(`"${required}" is a required stage and cannot be removed.`);
        return;
      }
    }
    setLocalError(null);
    await onSave(names);
    commitBaseline(names);
  }, [stages, onSave, setLocalError, commitBaseline]);

  const cancelRef = useRef(onCancelRequest);
  const saveRef = useRef(saveSignal);

  useEffect(() => {
    if (cancelRef.current !== onCancelRequest) {
      cancelRef.current = onCancelRequest;
      if (onCancelRequest > 0) {
        resetToBaseline();
      }
    }
  }, [onCancelRequest, resetToBaseline]);

  useEffect(() => {
    if (saveRef.current !== saveSignal) {
      saveRef.current = saveSignal;
      if (saveSignal > 0) {
        performSave();
      }
    }
  }, [saveSignal, performSave]);

  const errorMessage = localError ?? saveError;

  return (
    <div className="flex flex-col gap-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stages.map((stage) => stage.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2" aria-label="Pipeline stages list">
            {stages.map((stage) => {
              const isRequired = REQUIRED_STAGE_SET.has(stage.name);
              const canRemove = !isRequired && stages.length > STAGES_MIN_COUNT;
              return (
                <SortablePipelineStageRow
                  key={stage.id}
                  stage={stage}
                  canRemove={canRemove}
                  onRename={handleRename}
                  onColorChange={handleColorChange}
                  onRemove={handleRemove}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {stages.length < STAGES_MAX_COUNT ? (
        <AddStageInput newStageName={newStageName} onNameChange={setNewStageName} onAdd={handleAdd} />
      ) : null}

      {errorMessage ? (
        <p role="alert" className="text-sm text-brand-700 dark:text-brand-300">
          {errorMessage}
        </p>
      ) : null}

      <p className="text-xs text-text-3">
        {stages.length} / {STAGES_MAX_COUNT} stages · colors from{" "}
        {STAGE_COLOR_PICKER_OPTIONS.length} presets
      </p>
    </div>
  );
}

export default PipelineStagesEditor;
