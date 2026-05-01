/** Side panel showing application details, inline notes, stage selector, and stage history. */

import { useRef, useMemo } from "react";

import { useDetailPanelState } from "../hooks/useDetailPanelState";
import { useDetailPanelKeyboard } from "../hooks/useDetailPanelKeyboard";
import { DetailPanelHeader } from "./DetailPanelHeader";
import { Button } from "./ui/button";
import { PanelBody } from "./DetailPanelBody";
import UndoToast from "./UndoToast";
import { usePanelDrag } from "../hooks/usePanelDrag";

function DiscardDialog({ onDiscard, onCancel }) {
  return (
    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="discard-dialog-title">
      <div className="bg-card rounded-2xl border border-border shadow-lg w-full max-w-sm mx-auto relative">
        <div className="p-6">
          <h3 id="discard-dialog-title" className="font-display text-base font-semibold text-foreground">Discard unsaved notes?</h3>
          <p className="mt-1 text-sm text-muted-foreground">Your changes will be lost.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <Button type="button" variant="destructive" size="sm" onClick={onDiscard}>Discard</Button>
          </div>
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
          <div className="flex w-full shrink-0 touch-none items-center justify-center py-3 md:hidden" aria-hidden="true" {...panelDragHandlers}>
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
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
        className={`fixed inset-x-0 bottom-0 h-[90vh] rounded-t-xl bg-card shadow-sm border-l border-border transition-transform duration-[250ms] md:inset-x-auto md:bottom-auto md:right-0 md:top-0 md:h-full md:w-[480px] md:rounded-none ${isOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-y-0 md:translate-x-full"}`}
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
