/** Hook for managing pipeline stages state, validation, and mutations. */

import { useState, useCallback, useEffect, useMemo } from "react";

import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";

import { useStageColors } from "./useStageColors";
import { readStageColorOverrides, resolveStagePickerKey } from "../lib/stageColorPrefs";
import { safeSet } from "../lib/safeStorage";
import { STAGE_COLOR_OVERRIDES_KEY } from "../lib/stageColorPrefs";

const STAGES_MIN_COUNT = 2;
const STAGES_MAX_COUNT = 10;

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

export function useStagesEditor(initialStages, onDirtyChange, applicationsByStage = {}) {
  const { colors: serverColors, updateColors } = useStageColors();
  const [baselineNames, setBaselineNames] = useState(() => [...initialStages]);
  const [baselineColors, setBaselineColors] = useState(() => serverColors || readStageColorOverrides());
  const [colorOverrides, setColorOverrides] = useState(() => serverColors || readStageColorOverrides());
  const [stages, setStages] = useState(() => buildStageItems(initialStages, serverColors || readStageColorOverrides()));
  const [newStageName, setNewStageName] = useState("");
  const [localError, setLocalError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

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
          safeSet(STAGE_COLOR_OVERRIDES_KEY, JSON.stringify(next));
          updateColors(next);
          return next;
        });
      }
      return prev.map((stage) => (stage.id === id ? { ...stage, colorKey } : stage));
    });
  }, [updateColors]);

  const handleRemoveClick = useCallback((id) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleRemoveConfirm = useCallback(() => {
    if (deleteTargetId) {
      setStages((prev) => prev.filter((stage) => stage.id !== deleteTargetId));
    }
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
  }, [deleteTargetId]);

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
    safeSet(STAGE_COLOR_OVERRIDES_KEY, JSON.stringify(baselineColors));
    updateColors(baselineColors);
    setLocalError(null);
    setNewStageName("");
  }, [baselineColors, baselineNames, updateColors]);

  const commitBaseline = useCallback((names) => {
    setBaselineNames([...names]);
    setBaselineColors({ ...colorOverrides });
    updateColors(colorOverrides);
  }, [colorOverrides, updateColors]);

  return {
    stages,
    sensors,
    newStageName,
    setNewStageName,
    localError,
    setLocalError,
    colorOverrides,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteTargetId,
    handleDragEnd,
    handleRename,
    handleColorChange,
    handleRemoveClick,
    handleRemoveConfirm,
    handleAdd,
    resetToBaseline,
    commitBaseline,
    applicationsByStage,
  };
}
