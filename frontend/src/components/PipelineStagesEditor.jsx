/** Pipeline stages editor with drag-to-reorder UI and validation. */

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
import { CARD_BASE, INPUT_BASE, BUTTON_PRIMARY } from "../lib/designTokens";

const STAGE_NAME_MAX_LENGTH = 40;
const STAGES_MIN_COUNT = 2;
const STAGES_MAX_COUNT = 10;

function useStagesEditor(initialStages, onSave) {
  const [stages, setStages] = useState(() =>
    initialStages.map((name, i) => ({ id: `stage-${i}-${name}`, name }))
  );
  const [newStageName, setNewStageName] = useState("");
  const [localError, setLocalError] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStages((prev) => arrayMove(prev, prev.findIndex((s) => s.id === active.id), prev.findIndex((s) => s.id === over.id)));
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
    if (stages.length >= STAGES_MAX_COUNT) { setLocalError(`Maximum ${STAGES_MAX_COUNT} stages allowed.`); return; }
    setLocalError(null);
    setStages((prev) => [...prev, { id: `stage-new-${Date.now()}`, name: trimmed }]);
    setNewStageName("");
  }, [newStageName, stages.length]);

  const handleSave = useCallback(async () => {
    const names = stages.map((s) => s.name.trim()).filter(Boolean);
    if (names.length < STAGES_MIN_COUNT) { setLocalError(`At least ${STAGES_MIN_COUNT} stages are required.`); return; }
    if (names.length > STAGES_MAX_COUNT) { setLocalError(`Maximum ${STAGES_MAX_COUNT} stages allowed.`); return; }
    setLocalError(null);
    await onSave(names);
  }, [stages, onSave]);

  return { stages, sensors, newStageName, setNewStageName, localError, handleDragEnd, handleRename, handleRemove, handleAdd, handleSave };
}

function SortableStageItem({ id, value, onRename, onRemove, canRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`flex items-center gap-2 ${CARD_BASE} px-3 py-2`}
    >
      <button type="button" {...attributes} {...listeners} aria-label="Drag to reorder" className="cursor-grab text-gray-400 hover:text-gray-600 transition-colors focus:outline-none dark:text-gray-500 dark:hover:text-gray-300">
        <GripVertical className="h-4 w-4" />
      </button>
      <input type="text" value={value} maxLength={STAGE_NAME_MAX_LENGTH} onChange={(e) => onRename(id, e.target.value)} className="flex-1 rounded border-0 bg-transparent text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-500/30 dark:text-gray-200" aria-label={`Stage name: ${value}`} />
      {canRemove && (
        <button type="button" onClick={() => onRemove(id)} aria-label={`Remove stage ${value}`} className="text-gray-300 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 dark:text-gray-500 dark:hover:text-red-400">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function AddStageInput({ newStageName, onNameChange, onAdd }) {
  return (
    <div className="flex items-center gap-2">
      <input type="text" value={newStageName} onChange={(e) => onNameChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }} placeholder="New stage name" maxLength={STAGE_NAME_MAX_LENGTH} aria-label="New stage name" className={`${INPUT_BASE} flex-1`} />
      <button type="button" onClick={onAdd} disabled={!newStageName.trim()} aria-label="Add stage" className="flex items-center gap-1 rounded-button bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
        <Plus className="h-4 w-4" />
        Add
      </button>
    </div>
  );
}

function StagesSaveFooter({ count, onSave, isSaving }) {
  return (
    <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
      <p className="text-xs text-gray-400">{count} / {STAGES_MAX_COUNT} stages</p>
      <button type="button" onClick={onSave} disabled={isSaving} className={`flex items-center gap-2 ${BUTTON_PRIMARY}`}>
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Save stages
      </button>
    </div>
  );
}

function PipelineStagesEditor({ initialStages, onSave, isSaving, saveError }) {
  const { stages, sensors, newStageName, setNewStageName, localError, handleDragEnd, handleRename, handleRemove, handleAdd, handleSave } = useStagesEditor(initialStages, onSave);
  const errorMessage = localError ?? saveError;

  return (
    <div className="flex flex-col gap-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2" aria-label="Pipeline stages list">
            {stages.map((stage) => (
              <SortableStageItem key={stage.id} id={stage.id} value={stage.name} onRename={handleRename} onRemove={handleRemove} canRemove={stages.length > STAGES_MIN_COUNT} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {stages.length < STAGES_MAX_COUNT && <AddStageInput newStageName={newStageName} onNameChange={setNewStageName} onAdd={handleAdd} />}
      {errorMessage && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
      <StagesSaveFooter count={stages.length} onSave={handleSave} isSaving={isSaving} />
    </div>
  );
}

export default PipelineStagesEditor;
