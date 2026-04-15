/** Thin wrapper rendering stage timeline and calendar events for an application. */

import ApplicationTimeline from "./ApplicationTimeline";
import CalendarEventsList from "./CalendarEventsList";

export function DetailPanelTimeline({ stageHistory, applicationId, onAddEvent }) {
  return (
    <>
      <ApplicationTimeline stageHistory={stageHistory} applicationId={applicationId} />
      <CalendarEventsList applicationId={applicationId} onAddEvent={onAddEvent} />
    </>
  );
}
