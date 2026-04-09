/** Inline notes editor for an application in the detail panel. */

import { useState } from "react";

import Pencil from "lucide-react/dist/esm/icons/pencil";

import { useUpdateApplication } from "../hooks/useApplications";
import { NOTES_MAX_LENGTH } from "../lib/constants";

function NotesEditor({ applicationId, initialValue }) {
  const { mutate: updateApp } = useUpdateApplication();
  const [isEditing, setIsEditing] = useState(false);
  const [savedValue, setSavedValue] = useState(initialValue ?? "");
  const [draft, setDraft] = useState(initialValue ?? "");
  const [errorMsg, setErrorMsg] = useState(null);

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
    updateApp(
      { id: applicationId, body: { notes: draft } },
      {
        onSuccess: () => {
          setSavedValue(draft);
          setIsEditing(false);
          setErrorMsg(null);
        },
        onError: () => {
          setErrorMsg("Failed to save notes. Please try again.");
          setDraft(savedValue);
          setIsEditing(false);
        },
      }
    );
  };

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
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:hover:bg-gray-700 dark:hover:text-gray-300"
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
          <textarea
            id="notes-textarea"
            className="min-h-[120px] resize-y rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            aria-label="Notes"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={NOTES_MAX_LENGTH}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {draft.length}/{NOTES_MAX_LENGTH}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
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
