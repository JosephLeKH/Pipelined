/** Inline notes editor for an application in the detail panel. */

import { useState, useEffect } from "react";

import Pencil from "lucide-react/dist/esm/icons/pencil";

import { useUpdateApplication } from "../hooks/useApplications";
import { NOTES_MAX_LENGTH } from "../lib/constants";
import { Button } from "./ui/button";
import MarkdownEditor from "./MarkdownEditor";

const AMBER_PCT = 0.8;

function NotesEditView({ value, onChange, maxLength, onSave, onCancel }) {
  const charPct = value.length / maxLength;
  const charCls = charPct >= 1 ? "text-destructive" : charPct >= AMBER_PCT ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";
  return (
    <>
      <MarkdownEditor id="notes-textarea" value={value} onChange={onChange} maxLength={maxLength} />
      <div className="flex items-center justify-between">
        <span className={`text-xs ${charCls}`}>{value.length}/{maxLength}</span>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button type="button" size="sm" onClick={onSave}>Save</Button>
        </div>
      </div>
    </>
  );
}

function NotesEditor({ applicationId, initialValue, onDirtyChange }) {
  const { mutate: updateApp } = useUpdateApplication();
  const [isEditing, setIsEditing] = useState(false);
  const [savedValue, setSavedValue] = useState(initialValue ?? "");
  const [draft, setDraft] = useState(initialValue ?? "");
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    onDirtyChange?.(isEditing && draft !== savedValue);
  }, [isEditing, draft, savedValue, onDirtyChange]);

  const handleEdit = () => { setDraft(savedValue); setErrorMsg(null); setIsEditing(true); };
  const handleCancel = () => { setDraft(savedValue); setErrorMsg(null); setIsEditing(false); };
  const handleSave = () => {
    const trimmed = draft.trim();
    updateApp({ id: applicationId, body: { notes: trimmed } }, {
      onSuccess: () => { setSavedValue(trimmed); setDraft(trimmed); setIsEditing(false); setErrorMsg(null); },
      onError: () => setErrorMsg("Failed to save notes. Please try again."),
    });
  };

  return (
    <div className="flex flex-col gap-1.5" data-testid="notes-editor">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor={isEditing ? "notes-textarea" : undefined}>Notes</label>
        {!isEditing && (
          <Button type="button" variant="ghost" size="icon" onClick={handleEdit} aria-label="Edit notes" className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>
      {errorMsg && <p role="alert" className="text-xs text-destructive">{errorMsg}</p>}
      {isEditing ? (
        <NotesEditView value={draft} onChange={setDraft} maxLength={NOTES_MAX_LENGTH} onSave={handleSave} onCancel={handleCancel} />
      ) : (
        <p className="whitespace-pre-wrap text-sm text-foreground" data-testid="notes-display">
          {savedValue || <span className="text-muted-foreground">No notes yet.</span>}
        </p>
      )}
    </div>
  );
}

export default NotesEditor;
