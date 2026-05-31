/** State management hook for DetailPanel: CRUD, undo/delete, and stage update logic. */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import { useDeleteApplication, useRestoreApplication, useUpdateApplication } from "./useApplications";
import { trackEvent } from "../lib/analytics";

function useDetailPanelActions(cachedApp, setCachedApp, notesDirty, setNotesDirty, onClose, updateApp) {
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const confirmClose = useCallback(() => {
    if (notesDirty) {
      setShowDiscardDialog(true);
      return;
    }
    setNotesDirty(false);
    onClose();
  }, [notesDirty, setNotesDirty, onClose]);

  const confirmDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    setNotesDirty(false);
    onClose();
  }, [setNotesDirty, onClose]);

  const cancelDiscard = useCallback(() => {
    setShowDiscardDialog(false);
  }, []);

  const handleStageChange = useCallback((e) => {
    if (!cachedApp) return;
    const from_stage = cachedApp.current_stage;
    const to_stage = e.target.value;
    setCachedApp((prev) => prev ? { ...prev, current_stage: to_stage } : prev);
    updateApp({ id: cachedApp.id, body: { current_stage: to_stage } }, {
      onError: () => {
        setCachedApp((prev) => prev ? { ...prev, current_stage: from_stage } : prev);
        toast.error("Couldn't update stage — reverted");
      },
    });
    trackEvent("application_stage_changed", { from_stage, to_stage });
  }, [cachedApp, setCachedApp, updateApp]);

  const handleUpdate = useCallback(
    (body) => { if (cachedApp) updateApp({ id: cachedApp.id, body }); },
    [cachedApp, updateApp]
  );

  return { confirmClose, handleStageChange, handleUpdate, showDiscardDialog, confirmDiscard, cancelDiscard };
}

function useDetailPanelUndo(cachedApp, onClose, deleteApp, restoreApp) {
  const [undoPendingId, setUndoPendingId] = useState(null);

  const handleDelete = useCallback(() => {
    if (!cachedApp) return;
    deleteApp(cachedApp.id, {
      onSuccess: () => setUndoPendingId(cachedApp.id),
      onError: () => toast.error("Couldn't delete — undone"),
    });
  }, [cachedApp, deleteApp]);

  const handleUndoDelete = useCallback(() => {
    restoreApp(undoPendingId, {
      onSuccess: () => setUndoPendingId(null),
      onError: () => { setUndoPendingId(null); onClose(); },
    });
  }, [undoPendingId, restoreApp, onClose]);

  const handleUndoDismiss = useCallback(() => {
    setUndoPendingId(null);
    onClose();
  }, [onClose]);

  return { undoPendingId, handleDelete, handleUndoDelete, handleUndoDismiss };
}

export function useDetailPanelState(application, onClose, resetDrag) {
  const [cachedApp, setCachedApp] = useState(application);
  const [notesDirty, setNotesDirty] = useState(false);
  const { mutate: updateApp } = useUpdateApplication();
  const { mutate: deleteApp } = useDeleteApplication();
  const { mutate: restoreApp } = useRestoreApplication();

  useEffect(() => {
    if (application) { setCachedApp(application); resetDrag(); }
  }, [application, resetDrag]);

  const { confirmClose, handleStageChange, handleUpdate, showDiscardDialog, confirmDiscard, cancelDiscard } = useDetailPanelActions(
    cachedApp, setCachedApp, notesDirty, setNotesDirty, onClose, updateApp
  );

  const { undoPendingId, handleDelete, handleUndoDelete, handleUndoDismiss } = useDetailPanelUndo(
    cachedApp, onClose, deleteApp, restoreApp
  );

  return { cachedApp, setNotesDirty, undoPendingId, confirmClose, handleDelete, handleUndoDelete, handleUndoDismiss, handleStageChange, handleUpdate, showDiscardDialog, confirmDiscard, cancelDiscard };
}
