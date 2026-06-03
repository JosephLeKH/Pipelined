/** Full-page application detail view. Replaces the legacy drawer panel.
 *  Route: /applications/:id. Composes header + overview rail + tabs.
 *  Reuses useDetailPanelState for stage / update / delete + undo logic. */

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { useApplication } from "../hooks/useApplications";
import { useDetailPanelState } from "../hooks/useDetailPanelState";
import { showUndoToast } from "../lib/showUndoToast";
import { MODAL_BACKDROP, MODAL_CARD } from "../lib/designTokens";

import ApplicationDetailHeader from "../components/detail/ApplicationDetailHeader";
import DetailPanelOverviewRail from "../components/detail/DetailPanelOverviewRail";
import DetailPanelTabs from "../components/detail/DetailPanelTabs";
import OverviewTab from "../components/detail/tabs/OverviewTab";
import AgentsTab from "../components/detail/tabs/AgentsTab";
import ActivityTab from "../components/detail/tabs/ActivityTab";
import NotesTab from "../components/detail/tabs/NotesTab";
import { useAgentStates } from "../components/detail/useAgentStates";
import { Button } from "../components/ui/button";

function DiscardDialog({ onDiscard, onCancel }) {
  return (
    <div className={`${MODAL_BACKDROP}`} role="alertdialog" aria-modal="true" aria-labelledby="discard-dialog-title">
      <div className={`${MODAL_CARD} max-w-sm p-6`}>
        <h3 id="discard-dialog-title" className="text-base font-semibold text-text-1">
          Discard unsaved notes?
        </h3>
        <p className="mt-1 text-sm text-text-2">Your changes will be lost.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button type="button" variant="destructive" size="sm" onClick={onDiscard}>Discard</Button>
        </div>
      </div>
    </div>
  );
}

function TabContent({ activeTab, application, handleUpdate, onAddEvent, onDirtyChange, agentStates, expandFollowUpDraft }) {
  return (
    <div
      role="tabpanel"
      id={`detail-tabpanel-${activeTab}`}
      aria-labelledby={`detail-tab-${activeTab}`}
      className="py-6"
    >
      {activeTab === "overview" && (
        <OverviewTab application={application} onUpdate={handleUpdate} />
      )}
      {activeTab === "agents" && (
        <AgentsTab
          application={application}
          onUpdate={handleUpdate}
          agentStates={agentStates}
          expandFollowUpDraft={expandFollowUpDraft}
        />
      )}
      {activeTab === "activity" && (
        <ActivityTab application={application} onAddEvent={onAddEvent} />
      )}
      {activeTab === "notes" && (
        <NotesTab application={application} onDirtyChange={onDirtyChange} />
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 sm:px-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-1 border-t-brand-600" aria-label="Loading" />
    </div>
  );
}

function NotFoundState({ onBack }) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 text-center sm:px-8">
      <h1 className="text-2xl font-semibold text-text-1">Application not found</h1>
      <p className="mt-2 text-sm text-text-2">It may have been deleted or you don&apos;t have access.</p>
      <Button type="button" variant="default" size="sm" className="mt-6" onClick={onBack}>
        Back to dashboard
      </Button>
    </div>
  );
}

function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: application, isLoading, isError } = useApplication(id);
  const [activeTab, setActiveTab] = useState("overview");

  const expandFollowUpDraft =
    searchParams.get("section") === "follow-up" || searchParams.get("action") === "follow-up";

  useEffect(() => {
    if (expandFollowUpDraft) setActiveTab("agents");
  }, [expandFollowUpDraft]);

  const handleClose = useCallback(() => navigate("/dashboard"), [navigate]);
  const resetDragNoop = useCallback(() => {}, []);
  const state = useDetailPanelState(application, handleClose, resetDragNoop);
  const { states: agentStates } = useAgentStates(application ?? {});

  useEffect(() => {
    if (!state.undoPendingId) return undefined;
    const toastId = showUndoToast("Application deleted.", {
      onUndo: state.handleUndoDelete,
      onDismiss: state.handleUndoDismiss,
    });
    return () => toast.dismiss(toastId);
  }, [state.undoPendingId, state.handleUndoDelete, state.handleUndoDismiss]);

  if (isLoading) return <LoadingState />;
  if (isError || !application) return <NotFoundState onBack={handleClose} />;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8 sm:px-8 sm:py-10">
      <ApplicationDetailHeader application={application} onDelete={state.handleDelete} />
      <div className="flex flex-col gap-6">
        <DetailPanelOverviewRail application={application} onStageChange={state.handleStageChange} />
        <div>
          <DetailPanelTabs activeTab={activeTab} onSelect={setActiveTab} runningCount={0} />
          <TabContent
            activeTab={activeTab}
            application={application}
            handleUpdate={state.handleUpdate}
            onAddEvent={() => {}}
            onDirtyChange={state.setNotesDirty}
            agentStates={agentStates}
            expandFollowUpDraft={expandFollowUpDraft}
          />
        </div>
      </div>
      {state.showDiscardDialog && (
        <DiscardDialog onDiscard={state.confirmDiscard} onCancel={state.cancelDiscard} />
      )}
    </div>
  );
}

export default ApplicationDetailPage;
