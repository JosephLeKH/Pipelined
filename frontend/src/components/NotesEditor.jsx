/** Inline notes editor for an application in the detail panel. */

import { useState, useEffect } from "react";

import Pencil from "lucide-react/dist/esm/icons/pencil";

import { useUpdateApplication } from "../hooks/useApplications";
import { NOTES_MAX_LENGTH } from "../lib/constants";
import { BUTTON_PRIMARY } from "../lib/designTokens";
import MarkdownEditor from "./MarkdownEditor";

const AMBER_PCT = 0.8;

function NotesEditor({ applicationId, initialValue, onDirtyChange }) {
  const { mutate: updateApp } = useUpdateApplication();
  const [isEditing, setIsEditing] = useState(false);
  const [savedValue, setSavedValue] = useState(initialValue ?? "");
  const [draft, setDraft] = useState(initialValue ?? "");
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    onDirtyChange?.(isEditing && draft !== savedValue);
  }, [isEditing, draft, savedValue, onDirtyChange]);

  const handleEdit = () => {
    setDraft(savedValue);
    setErrorMsg(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(savedValue);
    setErrorMsg(null);
    setIsEditing(false);
  };

  const handleSave = () => {
    const trimmed = draft.trim();
    updateApp(
      { id: applicationId, body: { notes: trimmed } },
      {
        onSuccess: () => {
          setSavedValue(trimmed);
          setDraft(trimmed);
          setIsEditing(false);
          setErrorMsg(null);
        },
        onError: () => {
          setErrorMsg("Failed to save notes. Please try again.");
        },
      }
    );
  };

  const charPct = draft.length / NOTES_MAX_LENGTH;
  const charCls =
    charPct >= 1 ? "text-rose-600" : charPct >= AMBER_PCT ? "text-amber-600" : "text-gray-400";

  return (
    <div className="flex flex-col gap-1.5" data-testid="notes-editor">
      <div className="flex items-center justify-between">
        <label
          className="text-xs font-medium uppercase text-gray-400"
          htmlFor={isEditing ? "notes-textarea" : undefined}
        >
          Notes
        </label>
        {!isEditing && (
          <button
            type="button"
            onClick={handleEdit}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Edit notes"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {errorMsg && (
        <p role="alert" className="text-xs text-red-600">{errorMsg}</p>
      )}
      {isEditing ? (
        <>
          <MarkdownEditor
            id="notes-textarea"
            value={draft}
            onChange={setDraft}
            maxLength={NOTES_MAX_LENGTH}
          />
          <div className="flex items-center justify-between">
            <span className={`text-xs ${charCls}`}>{draft.length}/{NOTES_MAX_LENGTH}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="text-gray-600 hover:bg-gray-100 rounded-button active:scale-[0.98] transition-all duration-150 text-xs px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className={`${BUTTON_PRIMARY} text-xs px-2 py-1`}
              >
                Save
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300" data-testid="notes-display">
          {savedValue || <span className="text-gray-400">No notes yet.</span>}
        </p>
      )}
    </div>
  );
}

export default NotesEditor;
