/** Side panel showing application details, inline notes, stage selector, and stage history. */

import { useRef, useMemo, useEffect } from "react";
import { toast } from "sonner";

import { useDetailPanelState } from "../hooks/useDetailPanelState";
import { useDetailPanelKeyboard } from "../hooks/useDetailPanelKeyboard";
import { useSidebarCollapsed } from "../hooks/useSidebarCollapsed";
import { DetailPanelHeader } from "./DetailPanelHeader";
import { Button } from "./ui/button";
import { PanelBody } from "./DetailPanelBody";
import { usePanelDrag } from "../hooks/usePanelDrag";
import { showUndoToast } from "../lib/showUndoToast";
import {
  DETAIL_PANEL_WIDTH_PX,
  DRAWER_ANIMATION_MS,
  SIDEBAR_COLLAPSED_WIDTH_PX,
  SIDEBAR_WIDTH_PX,
} from "../lib/constants";
import { MODAL_BACKDROP, MODAL_CARD } from "../lib/designTokens";

function DiscardDialog({ onDiscard, onCancel }) {
  return (
    <div
      className={`${MODAL_BACKDROP} absolute inset-0 z-50`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="discard-dialog-title"
    >
      <div className={`${MODAL_CARD} max-w-sm p-6`}>
        <h3 id="discard-dialog-title" className="text-base font-semibold text-text-1">
          Discard unsaved notes?
        </h3>
        <p className="mt-1 text-sm text-text-2">Your changes will be lost.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={onDiscard}>
            Discard
          </Button>
        </div>
      </div>
    </div>
  );
}

function PanelContent({
  displayApp,
  isOpen,
  panelDragHandlers,
  actions,
  showDiscardDialog,
  expandFollowUpDraft,
}) {
  return (
    <>
      {isOpen && !displayApp && (
        <h2 id="detail-panel-heading" className="sr-only">
          Application details
        </h2>
      )}
      {displayApp && (
        <div key={displayApp.id} className="flex h-full flex-col overflow-y-auto bg-surface-0">
          <div
            className="flex w-full shrink-0 touch-none items-center justify-center py-3 md:hidden"
            aria-hidden="true"
            {...panelDragHandlers}
          >
            <div className="h-1 w-10 rounded-full bg-text-3/30" />
          </div>
          <DetailPanelHeader application={displayApp} onClose={actions.onClose} onDelete={actions.onDelete} />
          <PanelBody
            application={displayApp}
            handleStageChange={actions.onStageChange}
            handleUpdate={actions.onUpdate}
            onAddEvent={actions.onAddEvent}
            onDirtyChange={actions.onDirtyChange}
            expandFollowUpDraft={expandFollowUpDraft}
          />
        </div>
      )}
      {showDiscardDialog && (
        <DiscardDialog onDiscard={actions.onConfirmDiscard} onCancel={actions.onCancelDiscard} />
      )}
    </>
  );
}

function DetailPanel({ application, onClose, onAddEvent, expandFollowUpDraft = false }) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const { collapsed } = useSidebarCollapsed();
  const { dragOffset, reset: resetDrag, handlers: panelDragHandlers } = usePanelDrag(onClose);
  const {
    cachedApp,
    setNotesDirty,
    undoPendingId,
    confirmClose,
    handleDelete,
    handleUndoDelete,
    handleUndoDismiss,
    handleStageChange,
    handleUpdate,
    showDiscardDialog,
    confirmDiscard,
    cancelDiscard,
  } = useDetailPanelState(application, onClose, resetDrag);
  const panelOpen = Boolean(application);
  const { handlePanelKeyDown, handleOverlayClick } = useDetailPanelKeyboard(
    panelRef,
    overlayRef,
    confirmClose,
    panelOpen,
  );
  const displayApp = application ?? cachedApp;
  const isOpen = Boolean(application) || Boolean(undoPendingId);
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH_PX : SIDEBAR_WIDTH_PX;
  const actions = useMemo(
    () => ({
      onClose: confirmClose,
      onDelete: handleDelete,
      onStageChange: handleStageChange,
      onUpdate: handleUpdate,
      onAddEvent,
      onDirtyChange: setNotesDirty,
      onUndoDelete: handleUndoDelete,
      onUndoDismiss: handleUndoDismiss,
      onConfirmDiscard: confirmDiscard,
      onCancelDiscard: cancelDiscard,
    }),
    [
      confirmClose,
      handleDelete,
      handleStageChange,
      handleUpdate,
      onAddEvent,
      setNotesDirty,
      handleUndoDelete,
      handleUndoDismiss,
      confirmDiscard,
      cancelDiscard,
    ],
  );

  const panelStyle = dragOffset
    ? { transform: `translateY(${dragOffset}px)`, transition: "none" }
    : { transitionDuration: `${DRAWER_ANIMATION_MS}ms` };

  useEffect(() => {
    if (!undoPendingId) return undefined;
    const toastId = showUndoToast("Application deleted.", {
      onUndo: handleUndoDelete,
      onDismiss: handleUndoDismiss,
    });
    return () => toast.dismiss(toastId);
  }, [undoPendingId, handleUndoDelete, handleUndoDismiss]);

  return (
    <div
      ref={overlayRef}
      data-testid="panel-overlay"
      className={`fixed inset-0 z-40 transition-opacity motion-reduce:transition-none ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{ transitionDuration: `${DRAWER_ANIMATION_MS}ms` }}
      onClick={handleOverlayClick}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-black/30 motion-reduce:backdrop-blur-none"
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        data-testid="detail-panel"
        className={`fixed inset-y-0 right-0 top-11 flex w-full flex-col border-l border-border-1 bg-surface-0 shadow-modal motion-safe-drawer md:max-w-[520px] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ ...panelStyle }}
        role={isOpen ? "dialog" : undefined}
        aria-modal={isOpen ? true : undefined}
        aria-labelledby={isOpen ? "detail-panel-heading" : undefined}
        aria-label={isOpen && !displayApp ? "Application details" : undefined}
        onKeyDown={handlePanelKeyDown}
      >
        <PanelContent
          displayApp={displayApp}
          isOpen={isOpen}
          panelDragHandlers={panelDragHandlers}
          actions={actions}
          showDiscardDialog={showDiscardDialog}
          expandFollowUpDraft={expandFollowUpDraft}
        />
      </div>
    </div>
  );
}

export default DetailPanel;
