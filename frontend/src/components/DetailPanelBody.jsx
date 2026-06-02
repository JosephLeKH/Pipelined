/** Detail panel body: sticky overview rail + tab strip + active tab content. */

import { useState } from "react";

import DetailPanelOverviewRail from "./detail/DetailPanelOverviewRail";
import DetailPanelTabs from "./detail/DetailPanelTabs";
import OverviewTab from "./detail/tabs/OverviewTab";
import AgentsTab from "./detail/tabs/AgentsTab";
import ActivityTab from "./detail/tabs/ActivityTab";
import NotesTab from "./detail/tabs/NotesTab";
import { useAgentStates } from "./detail/useAgentStates";

function TabPanel({ activeTab, application, handleUpdate, onAddEvent, onDirtyChange, agentStates, expandFollowUpDraft }) {
  return (
    <div
      role="tabpanel"
      id={`detail-tabpanel-${activeTab}`}
      aria-labelledby={`detail-tab-${activeTab}`}
      className="min-h-0 flex-1 overflow-y-auto"
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

export function PanelBody({
  application,
  handleStageChange,
  handleUpdate,
  onAddEvent,
  onDirtyChange,
  expandFollowUpDraft = false,
}) {
  const [activeTab, setActiveTab] = useState(expandFollowUpDraft ? "agents" : "overview");
  const { states: agentStates, runningCount } = useAgentStates(application);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface-0">
      <DetailPanelOverviewRail application={application} onStageChange={handleStageChange} />
      <DetailPanelTabs activeTab={activeTab} onSelect={setActiveTab} runningCount={runningCount} />
      <TabPanel
        activeTab={activeTab}
        application={application}
        handleUpdate={handleUpdate}
        onAddEvent={onAddEvent}
        onDirtyChange={onDirtyChange}
        agentStates={agentStates}
        expandFollowUpDraft={expandFollowUpDraft}
      />
    </div>
  );
}
