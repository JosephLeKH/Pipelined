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

import { useStageColors } from "../hooks/useStageColors";
import { useStagesEditor } from "../hooks/useStagesEditor";
import {
  REQUIRED_PIPELINE_STAGES,
  STAGE_COLOR_PICKER_OPTIONS,
} from "../lib/constants";
import { resolveStageDotColor, resolveStagePickerKey } from "../lib/stageColorPrefs";
import PipelineStageRow from "./PipelineStageRow";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

const STAGE_NAME_MAX_LENGTH = 40;
const STAGES_MIN_COUNT = 2;
const STAGES_MAX_COUNT = 10;
const REQUIRED_STAGE_SET = new Set(REQUIRED_PIPELINE_STAGES);

function dotColorForStage(stage) {
  return STAGE_COLOR_PICKER_OPTIONS.find((option) => option.key === stage.colorKey)?.hex
    ?? resolveStageDotColor(stage.name);
}

function SortablePipelineStageRow({ stage, canRemove, onRename, onColorChange, onRemoveClick }) {
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
      onRemoveClick={onRemoveClick}
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
  applicationsByStage = {},
}) {
  const {
    stages,
    sensors,
    newStageName,
    setNewStageName,
    localError,
    setLocalError,
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
  } = useStagesEditor(initialStages, onDirtyChange, applicationsByStage);

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
              const appCount = applicationsByStage[stage.name] ?? 0;
              const canRemove = !isRequired && stages.length > STAGES_MIN_COUNT && appCount === 0;
              const disabledTooltip = appCount > 0
                ? `Move ${appCount} application${appCount === 1 ? "" : "s"} to another stage first`
                : null;
              return (
                <SortablePipelineStageRow
                  key={stage.id}
                  stage={stage}
                  canRemove={canRemove}
                  onRename={handleRename}
                  onColorChange={handleColorChange}
                  onRemoveClick={handleRemoveClick}
                  disabledTooltip={disabledTooltip}
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

      {deleteTargetId && stages.find((s) => s.id === deleteTargetId) && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete stage?</AlertDialogTitle>
              <AlertDialogDescription>
                {(() => {
                  const targetStage = stages.find((s) => s.id === deleteTargetId);
                  const appCount = applicationsByStage[targetStage?.name] ?? 0;
                  if (appCount > 0) {
                    return `Cannot delete "${targetStage?.name}" — it contains ${appCount} application${appCount === 1 ? "" : "s"}. Move them to another stage first.`;
                  }
                  return `Delete "${targetStage?.name}"? This cannot be undone.`;
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {(() => {
              const appCount = applicationsByStage[stages.find((s) => s.id === deleteTargetId)?.name] ?? 0;
              return appCount === 0 ? (
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRemoveConfirm}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              ) : (
                <AlertDialogFooter>
                  <AlertDialogCancel>Close</AlertDialogCancel>
                </AlertDialogFooter>
              );
            })()}
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

export default PipelineStagesEditor;
