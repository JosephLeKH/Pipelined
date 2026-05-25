/** Timeline section: email events, stage history, and calendar events for an application. */

import ApplicationTimeline from "./ApplicationTimeline";
import CalendarEventsList from "./CalendarEventsList";
import EmailTimelineSection from "./EmailTimelineSection";
import { DetailSectionTitle } from "./DetailPanelSections";

export function DetailPanelTimeline({ stageHistory, applicationId, onAddEvent }) {
  return (
    <section aria-label="Timeline">
      <DetailSectionTitle>Timeline</DetailSectionTitle>
      <EmailTimelineSection applicationId={applicationId} />
      <ApplicationTimeline stageHistory={stageHistory} applicationId={applicationId} />
      <CalendarEventsList applicationId={applicationId} onAddEvent={onAddEvent} />
    </section>
  );
}
