/** Side panel showing application details, inline notes, stage selector, and stage history. */

import { useRef, useMemo } from "react";

import { useDetailPanelState } from "../hooks/useDetailPanelState";
import { useDetailPanelKeyboard } from "../hooks/useDetailPanelKeyboard";
import { DetailPanelHeader } from "./DetailPanelHeader";
import { PanelBody } from "./DetailPanelBody";
import UndoToast from "./UndoToast";
import { usePanelDrag } from "../hooks/usePanelDrag";

function DiscardDialog({ onDiscard, onCancel }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40" role="alertdialog" aria-modal="true" aria-labelledby="discard-dialog-title">
      <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-5 shadow-lg dark:bg-gray-800">
        <h3 id="discard-dialog-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">Discard unsaved notes?</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Your changes will be lost.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
          <button type="button" onClick={onDiscard} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">Discard</button>
        </div>
      </div>
    </div>
  );
}

function PanelContent({ displayApp, panelDragHandlers, actions, undoPendingId, showDiscardDialog }) {
  return (
    <>
      {displayApp && (
        <div key={displayApp.id} className="flex h-full flex-col overflow-y-auto animate-slideInRight">
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-gray-300 touch-none md:hidden" aria-hidden="true" {...panelDragHandlers} />
          <DetailPanelHeader application={displayApp} onClose={actions.onClose} onDelete={actions.onDelete} />
          <PanelBody
            application={displayApp}
            handleStageChange={actions.onStageChange}
            handleUpdate={actions.onUpdate}
            onAddEvent={actions.onAddEvent}
            onDirtyChange={actions.onDirtyChange}
          />
        </div>
      )}
      {showDiscardDialog && <DiscardDialog onDiscard={actions.onConfirmDiscard} onCancel={actions.onCancelDiscard} />}
      {undoPendingId && (
        <UndoToast message="Application deleted." onUndo={actions.onUndoDelete} onDismiss={actions.onUndoDismiss} />
      )}
    </>
  );
}

function DetailPanel({ application, onClose, onAddEvent }) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const { dragOffset, reset: resetDrag, handlers: panelDragHandlers } = usePanelDrag(onClose);
  const { cachedApp, setNotesDirty, undoPendingId, confirmClose, handleDelete,
    handleUndoDelete, handleUndoDismiss, handleStageChange, handleUpdate,
    showDiscardDialog, confirmDiscard, cancelDiscard,
  } = useDetailPanelState(application, onClose, resetDrag);
  const panelOpen = Boolean(application);
  const { handlePanelKeyDown, handleOverlayClick } = useDetailPanelKeyboard(panelRef, overlayRef, confirmClose, panelOpen);
  const displayApp = application ?? cachedApp;
  const isOpen = Boolean(application) || Boolean(undoPendingId);
  const actions = useMemo(() => ({
    onClose: confirmClose, onDelete: handleDelete, onStageChange: handleStageChange,
    onUpdate: handleUpdate, onAddEvent, onDirtyChange: setNotesDirty,
    onUndoDelete: handleUndoDelete, onUndoDismiss: handleUndoDismiss,
    onConfirmDiscard: confirmDiscard, onCancelDiscard: cancelDiscard,
  }), [confirmClose, handleDelete, handleStageChange, handleUpdate, onAddEvent, setNotesDirty, handleUndoDelete, handleUndoDismiss, confirmDiscard, cancelDiscard]);

  return (
    <div
      ref={overlayRef}
      data-testid="panel-overlay"
      className={`fixed inset-0 z-40 transition-opacity duration-200 ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={handleOverlayClick}
    >
      <div className="absolute inset-0 bg-black/30 pointer-events-none" aria-hidden="true" />
      <div
        ref={panelRef}
        className={`fixed inset-x-0 bottom-0 h-[90vh] rounded-t-xl bg-white shadow-sm border-l border-gray-200 dark:border-gray-700 transition-transform duration-[250ms] md:inset-x-auto md:bottom-auto md:right-0 md:top-0 md:h-full md:w-[480px] md:rounded-none dark:bg-gray-800 ${isOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-y-0 md:translate-x-full"}`}
        style={{ transform: dragOffset ? `translateY(${dragOffset}px)` : undefined, transition: dragOffset ? "none" : undefined }}
        role="dialog" aria-modal="true" aria-labelledby="detail-panel-heading" onKeyDown={handlePanelKeyDown}
      >
        <PanelContent
          displayApp={displayApp} panelDragHandlers={panelDragHandlers} actions={actions}
          undoPendingId={undoPendingId} showDiscardDialog={showDiscardDialog}
        />
      </div>
    </div>
  );
}

export default DetailPanel;
