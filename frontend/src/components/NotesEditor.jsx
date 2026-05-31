/** Inline notes editor for an application in the detail panel. */

import { useState, useEffect, useCallback, useRef } from "react";

import { toast } from "sonner";

import { useUpdateApplication } from "../hooks/useApplications";
import { NOTES_MAX_LENGTH } from "../lib/constants";
import { formatSavedAgo } from "../lib/dateUtils";
import { cn } from "../lib/utils";
import MarkdownEditor from "./MarkdownEditor";
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

const AMBER_PCT = 0.8;
const SAVE_STATUS_IDLE = "idle";
const SAVE_STATUS_SAVING = "saving";
const SAVE_STATUS_SAVED = "saved";
const SAVE_STATUS_ERROR = "error";
const SAVED_AGO_TICK_MS = 1000;

function NotesSaveStatus({ saveStatus, savedAt, errorMsg }) {
  if (errorMsg) {
    return <span className="text-xs text-brand-700">{errorMsg}</span>;
  }
  if (saveStatus === SAVE_STATUS_SAVING) {
    return <span className="text-xs text-text-3">Saving…</span>;
  }
  if (saveStatus === SAVE_STATUS_SAVED && savedAt) {
    return (
      <span className="text-xs text-text-3" data-testid="notes-save-status">
        Saved · {formatSavedAgo(savedAt)}
      </span>
    );
  }
  return null;
}

function NotesEditor({ applicationId, initialValue, onDirtyChange }) {
  const { mutate: updateApp } = useUpdateApplication();
  const containerRef = useRef(null);
  const [savedValue, setSavedValue] = useState(initialValue ?? "");
  const [draft, setDraft] = useState(initialValue ?? "");
  const [saveStatus, setSaveStatus] = useState(SAVE_STATUS_IDLE);
  const [savedAt, setSavedAt] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [, setTick] = useState(0);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);

  useEffect(() => {
    setSavedValue(initialValue ?? "");
    setDraft(initialValue ?? "");
    setSaveStatus(SAVE_STATUS_IDLE);
    setSavedAt(null);
    setErrorMsg(null);
  }, [applicationId, initialValue]);

  useEffect(() => {
    onDirtyChange?.(draft.trim() !== savedValue);
  }, [draft, savedValue, onDirtyChange]);

  useEffect(() => {
    if (saveStatus !== SAVE_STATUS_SAVED || !savedAt) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), SAVED_AGO_TICK_MS);
    return () => clearInterval(id);
  }, [saveStatus, savedAt]);

  const saveNotes = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed === savedValue) return;
    setSaveStatus(SAVE_STATUS_SAVING);
    setErrorMsg(null);
    updateApp({ id: applicationId, body: { notes: trimmed } }, {
      onSuccess: () => {
        setSavedValue(trimmed);
        setDraft(trimmed);
        setSaveStatus(SAVE_STATUS_SAVED);
        setSavedAt(new Date());
        setErrorMsg(null);
      },
      onError: () => {
        setSaveStatus(SAVE_STATUS_ERROR);
        setErrorMsg("Failed to save notes. Please try again.");
      },
    });
  }, [applicationId, draft, savedValue, updateApp]);

  const handleEditorBlur = (e) => {
    if (containerRef.current?.contains(e.relatedTarget)) return;
    const isDirty = draft.trim() !== savedValue;
    if (isDirty) {
      setPendingDraft(draft);
      setDiscardDialogOpen(true);
    } else {
      saveNotes();
    }
  };

  const handleDiscardConfirm = useCallback(() => {
    setDraft(savedValue);
    setDiscardDialogOpen(false);
    const discardedDraft = pendingDraft;
    const appIdAtDiscard = applicationId;
    setPendingDraft(null);
    toast.custom((toastId) => (
      <div className="rounded-lg border border-border bg-card p-4 text-sm shadow-lg">
        <p className="mb-2 text-text-1">Notes discarded.</p>
        <button
          type="button"
          onClick={() => {
            if (appIdAtDiscard !== applicationId) {
              toast.error("Can't restore notes — different application");
              toast.dismiss(toastId);
              return;
            }
            setDraft(discardedDraft);
            toast.dismiss(toastId);
          }}
          className="text-brand-600 hover:text-brand-700 font-medium dark:text-brand-400"
        >
          Undo
        </button>
      </div>
    ));
  }, [applicationId, savedValue, pendingDraft]);

  const handleKeepEditing = () => {
    setDiscardDialogOpen(false);
    setPendingDraft(null);
  };

  const charPct = draft.length / NOTES_MAX_LENGTH;
  const charCls = charPct >= 1
    ? "text-brand-700"
    : charPct >= AMBER_PCT
      ? "text-amber-600 dark:text-amber-400"
      : "text-text-3";

  return (
    <>
      <div className="flex flex-col gap-1.5" data-testid="notes-editor">
        <label className="text-xs font-medium uppercase text-text-3" htmlFor="notes-textarea">
          Notes
        </label>
        {errorMsg && saveStatus === SAVE_STATUS_ERROR && (
          <p role="alert" className="text-xs text-brand-700">{errorMsg}</p>
        )}
        <div
          ref={containerRef}
          className={cn(
            "rounded-md border border-transparent transition-[background-color,border-color]",
            "duration-hover ease-out motion-safe focus-within:border-border-1 focus-within:bg-surface-1",
          )}
        >
          <MarkdownEditor
            id="notes-textarea"
            value={draft}
            onChange={setDraft}
            maxLength={NOTES_MAX_LENGTH}
            className="px-2 pb-2 pt-1"
            onBlur={handleEditorBlur}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-xs ${charCls}`}>{draft.length}/{NOTES_MAX_LENGTH}</span>
          <NotesSaveStatus saveStatus={saveStatus} savedAt={savedAt} errorMsg={errorMsg} />
        </div>
      </div>

      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved notes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Keep editing or discard?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleKeepEditing}>
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default NotesEditor;
