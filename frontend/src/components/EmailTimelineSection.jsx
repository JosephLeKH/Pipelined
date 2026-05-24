/** Email classification timeline for an application detail panel. */

import Mail from "lucide-react/dist/esm/icons/mail";

import { useEmailEvents } from "../hooks/useApplications";
import { formatDate } from "../lib/dateUtils";
import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";

const EVENT_LABELS = {
  stage_updated: "Stage updated via email",
  application_tracked: "Tracked from email",
  email_classified: "Email classified",
};

function eventLabel(event) {
  if (event.stage && event.type === "stage_updated") {
    return `Moved to ${event.stage}`;
  }
  return EVENT_LABELS[event.type] ?? event.type.replace(/_/g, " ");
}

function EmailEventNode({ event }) {
  const colors = STAGE_COLORS[event.stage] ?? DEFAULT_STAGE_COLOR;

  return (
    <li className="flex items-start gap-3 pb-3" data-testid="email-timeline-node">
      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{eventLabel(event)}</p>
        {event.subject ? (
          <p className="truncate text-xs text-muted-foreground">{event.subject}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">{formatDate(event.timestamp)}</p>
        {event.stage ? (
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
          >
            {event.stage}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function EmailTimelineSection({ applicationId }) {
  const { data: events = [], isLoading, isError } = useEmailEvents(applicationId);

  if (isLoading) {
    return (
      <section aria-label="Email timeline" className="rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">Loading email timeline…</p>
      </section>
    );
  }

  if (isError || events.length === 0) {
    return null;
  }

  return (
    <section aria-label="Email timeline" className="rounded-lg border border-border p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Email timeline</h3>
      <ul className="list-none space-y-0" data-testid="email-timeline-list">
        {events.map((event) => (
          <EmailEventNode key={event.id} event={event} />
        ))}
      </ul>
    </section>
  );
}

export default EmailTimelineSection;
