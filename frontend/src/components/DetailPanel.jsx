/** Side panel showing application details, inline notes, stage selector, and stage history. */

import { useState, useEffect, useRef, useCallback } from "react";

import { useDeleteApplication, useRestoreApplication, useUpdateApplication } from "../hooks/useApplications";
import { useHotkeys } from "../hooks/useHotkeys";
import { DetailPanelHeader } from "./DetailPanelHeader";
import { PanelBody } from "./DetailPanelBody";
import UndoToast from "./UndoToast";
import { trackEvent } from "../lib/analytics";
import { usePanelDrag } from "../hooks/usePanelDrag";

const FOCUSABLE_SELECTORS = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function DetailPanel({ application, onClose, onAddEvent }) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const [undoPendingId, setUndoPendingId] = useState(null);
  const { dragOffset, reset: resetDrag, handlers: panelDragHandlers } = usePanelDrag(onClose);
  const [cachedApp, setCachedApp] = useState(application);
  const [notesDirty, setNotesDirty] = useState(false);
  const { mutate: updateApp } = useUpdateApplication();
  const { mutate: deleteApp } = useDeleteApplication();
  const { mutate: restoreApp } = useRestoreApplication();

  // Keep cachedApp in sync when panel is not in undo mode
  useEffect(() => {
    if (application) { setCachedApp(application); resetDrag(); }
  }, [application, resetDrag]);

  const handleDelete = useCallback(() => {
    if (!cachedApp) return;
    deleteApp(cachedApp.id, {
      onSuccess: () => setUndoPendingId(cachedApp.id),
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

  const confirmClose = useCallback(() => {
    if (notesDirty && !window.confirm("Discard unsaved notes?")) return;
    setNotesDirty(false);
    onClose();
  }, [notesDirty, onClose]);

  const handleKeyDown = useCallback(
    (e) => { if (e.key === "Escape") confirmClose(); },
    [confirmClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const panelOpen = Boolean(application);
  useHotkeys("s", () => { document.getElementById("stage-select")?.focus(); }, { enabled: panelOpen });
  useHotkeys("n", () => {
    const editBtn = document.querySelector("[aria-label='Edit notes']");
    if (editBtn) { editBtn.click(); } else { document.getElementById("notes-textarea")?.focus(); }
  }, { enabled: panelOpen });

  // Auto-focus first focusable element when panel opens
  useEffect(() => {
    if (application && panelRef.current) {
      const first = panelRef.current.querySelector(FOCUSABLE_SELECTORS);
      first?.focus();
    }
  }, [application]);

  // Trap focus inside panel while open
  const handlePanelKeyDown = useCallback((e) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const els = Array.from(panelRef.current.querySelectorAll(FOCUSABLE_SELECTORS));
    if (!els.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);

  const handleOverlayClick = useCallback(
    (e) => { if (e.target === overlayRef.current) confirmClose(); },
    [confirmClose]
  );

  const handleStageChange = useCallback(
    (e) => {
      if (!cachedApp) return;
      const from_stage = cachedApp.current_stage;
      const to_stage = e.target.value;
      setCachedApp((prev) => prev ? { ...prev, current_stage: to_stage } : prev);
      updateApp({ id: cachedApp.id, body: { current_stage: to_stage } }, {
        onError: () => setCachedApp((prev) => prev ? { ...prev, current_stage: from_stage } : prev),
      });
      trackEvent("application_stage_changed", { from_stage, to_stage });
    },
    [cachedApp, updateApp]
  );

  const handleUpdate = useCallback(
    (body) => { if (cachedApp) updateApp({ id: cachedApp.id, body }); },
    [cachedApp, updateApp]
  );

  const displayApp = application ?? cachedApp;
  const isOpen = Boolean(application) || Boolean(undoPendingId);

  return (
    <div
      ref={overlayRef}
      data-testid="panel-overlay"
      className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={handleOverlayClick}
    >
      <div
        ref={panelRef}
        className={`fixed inset-x-0 bottom-0 h-[90vh] rounded-t-xl bg-white shadow-xl transition-transform duration-[250ms] md:inset-x-auto md:bottom-auto md:right-0 md:top-0 md:h-full md:w-[480px] md:rounded-none dark:bg-slate-800 ${
          isOpen
            ? "translate-y-0 md:translate-x-0"
            : "translate-y-full md:translate-y-0 md:translate-x-full"
        }`}
        style={{ transform: dragOffset ? `translateY(${dragOffset}px)` : undefined, transition: dragOffset ? "none" : undefined }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-panel-heading"
        onKeyDown={handlePanelKeyDown}
      >
        {displayApp && (
          <div key={displayApp.id} className="flex h-full flex-col overflow-y-auto animate-slideInRight">
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-300 touch-none md:hidden" aria-hidden="true" {...panelDragHandlers} />
            <DetailPanelHeader application={displayApp} onClose={confirmClose} onDelete={handleDelete} />
            <PanelBody
              application={displayApp}
              handleStageChange={handleStageChange}
              handleUpdate={handleUpdate}
              onAddEvent={onAddEvent}
              onDirtyChange={setNotesDirty}
            />
          </div>
        )}
        {undoPendingId && (
          <UndoToast
            message="Application deleted."
            onUndo={handleUndoDelete}
            onDismiss={handleUndoDismiss}
          />
        )}
      </div>
    </div>
  );
}

export default DetailPanel;
