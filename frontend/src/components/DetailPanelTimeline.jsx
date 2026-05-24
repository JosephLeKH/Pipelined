/** Thin wrapper rendering stage timeline and calendar events for an application. */

import ApplicationTimeline from "./ApplicationTimeline";
import CalendarEventsList from "./CalendarEventsList";
import EmailTimelineSection from "./EmailTimelineSection";

export function DetailPanelTimeline({ stageHistory, applicationId, onAddEvent }) {
  return (
    <>
      <EmailTimelineSection applicationId={applicationId} />
      <ApplicationTimeline stageHistory={stageHistory} applicationId={applicationId} />
      <CalendarEventsList applicationId={applicationId} onAddEvent={onAddEvent} />
    </>
  );
}
