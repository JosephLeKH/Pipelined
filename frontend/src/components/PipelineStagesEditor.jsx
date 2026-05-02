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

import { Button } from "./ui/button";
import { Input } from "./ui/input";

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
  const handleRename = useCallback((id, value) => setStages((prev) => prev.map((s) => (s.id === id ? { ...s, name: value } : s))), []);
  const handleRemove = useCallback((id) => setStages((prev) => prev.filter((s) => s.id !== id)), []);
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
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-xl bg-card border border-border px-3 py-2 ${isDragging ? "opacity-50" : "opacity-100"}`}
    >
      <button type="button" {...attributes} {...listeners} aria-label="Drag to reorder" className="cursor-grab text-muted-foreground hover:text-foreground transition-colors focus:outline-none">
        <GripVertical className="h-4 w-4" />
      </button>
      <Input type="text" value={value} maxLength={STAGE_NAME_MAX_LENGTH} onChange={(e) => onRename(id, e.target.value)} className="flex-1 rounded border-0 bg-transparent text-sm text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring" aria-label={`Stage name: ${value}`} />
      {canRemove && (
        <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(id)} aria-label={`Remove stage ${value}`} className="h-7 w-7 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function AddStageInput({ newStageName, onNameChange, onAdd }) {
  return (
    <div className="flex items-center gap-2">
      <Input type="text" value={newStageName} onChange={(e) => onNameChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }} placeholder="New stage name" maxLength={STAGE_NAME_MAX_LENGTH} aria-label="New stage name" className="flex-1" />
      <Button type="button" variant="secondary" size="sm" onClick={onAdd} disabled={!newStageName.trim()} aria-label="Add stage">
        <Plus className="h-4 w-4" />
        Add
      </Button>
    </div>
  );
}

function StagesSaveFooter({ count, onSave, isSaving }) {
  return (
    <div className="flex items-center justify-between border-t border-border pt-3">
      <p className="text-xs text-muted-foreground">{count} / {STAGES_MAX_COUNT} stages</p>
      <Button type="button" onClick={onSave} disabled={isSaving} className="flex items-center gap-2">
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Save stages
      </Button>
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
      {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
      <StagesSaveFooter count={stages.length} onSave={handleSave} isSaving={isSaving} />
    </div>
  );
}

export default PipelineStagesEditor;
