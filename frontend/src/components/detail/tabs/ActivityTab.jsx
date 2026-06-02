/** Activity tab: stage history + email events + calendar events + agent log. */

import AgentActivitySection from "../../AgentActivitySection";
import { DetailPanelTimeline } from "../../DetailPanelTimeline";

function ActivityTab({ application, onAddEvent }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <DetailPanelTimeline
        stageHistory={application.stage_history}
        applicationId={application.id}
        onAddEvent={onAddEvent}
      />
      <AgentActivitySection applicationId={application.id} />
    </div>
  );
}

export default ActivityTab;
