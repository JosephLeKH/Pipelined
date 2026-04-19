/** Side panel showing application details, inline notes, stage selector, and stage history. */

import { useRef } from "react";

import { useDetailPanelState } from "../hooks/useDetailPanelState";
import { useDetailPanelKeyboard } from "../hooks/useDetailPanelKeyboard";
import { DetailPanelHeader } from "./DetailPanelHeader";
import { PanelBody } from "./DetailPanelBody";
import UndoToast from "./UndoToast";
import { usePanelDrag } from "../hooks/usePanelDrag";

function PanelContent({ displayApp, panelDragHandlers, confirmClose, handleDelete, handleStageChange, handleUpdate, onAddEvent, setNotesDirty, undoPendingId, handleUndoDelete, handleUndoDismiss }) {
  return (
    <>
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
        <UndoToast message="Application deleted." onUndo={handleUndoDelete} onDismiss={handleUndoDismiss} />
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
  } = useDetailPanelState(application, onClose, resetDrag);
  const panelOpen = Boolean(application);
  const { handlePanelKeyDown, handleOverlayClick } = useDetailPanelKeyboard(panelRef, overlayRef, confirmClose, panelOpen);
  const displayApp = application ?? cachedApp;
  const isOpen = Boolean(application) || Boolean(undoPendingId);

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
        className={`fixed inset-x-0 bottom-0 h-[90vh] rounded-t-xl bg-white shadow-xl transition-transform duration-[250ms] md:inset-x-auto md:bottom-auto md:right-0 md:top-0 md:h-full md:w-[480px] md:rounded-none dark:bg-slate-800 ${isOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-y-0 md:translate-x-full"}`}
        style={{ transform: dragOffset ? `translateY(${dragOffset}px)` : undefined, transition: dragOffset ? "none" : undefined }}
        role="dialog" aria-modal="true" aria-labelledby="detail-panel-heading" onKeyDown={handlePanelKeyDown}
      >
        <PanelContent
          displayApp={displayApp} panelDragHandlers={panelDragHandlers} confirmClose={confirmClose}
          handleDelete={handleDelete} handleStageChange={handleStageChange} handleUpdate={handleUpdate}
          onAddEvent={onAddEvent} setNotesDirty={setNotesDirty} undoPendingId={undoPendingId}
          handleUndoDelete={handleUndoDelete} handleUndoDismiss={handleUndoDismiss}
        />
      </div>
    </div>
  );
}

export default DetailPanel;
