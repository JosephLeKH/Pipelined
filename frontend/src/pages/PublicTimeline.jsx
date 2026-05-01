/** Read-only public timeline view for a shared timeline slug. */

import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";

import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { formatDate } from "../lib/dateUtils";
import { usePublicTimeline } from "../hooks/useSharing";
import { trackEvent } from "../lib/analytics";

function StagePill({ stage }) {
  const color = STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR;
  return (
    <span
      aria-label={stage}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
      {stage}
    </span>
  );
}

function TimelineRow({ app, isLast }) {
  const hasProgressed = app.stage_history && app.stage_history.length > 1;
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="h-3 w-3 rounded-full border-2 border-primary bg-card" />
        {!isLast && <div className="w-0.5 flex-1 bg-border" />}
      </div>

      <div className="flex flex-1 flex-col gap-1 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{app.company}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">{app.role_title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{formatDate(app.date_applied)}</span>
          <StagePill stage={app.current_stage} />
        </div>
        {hasProgressed && (
          <div className="mt-1 flex flex-wrap gap-1">
            {app.stage_history.map((entry, i) => (
              <span
                key={i}
                className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
              >
                {entry.stage ?? entry}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="font-display text-2xl font-bold text-foreground">Link not found</h1>
      <p className="text-muted-foreground">This timeline link has expired or been revoked.</p>
      <Link to="/" className="text-primary hover:underline">Go to Pipelined →</Link>
    </div>
  );
}

function TimelineHeader({ timeline }) {
  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">{timeline.display_name}'s Job Search</h1>
          <p className="text-sm text-muted-foreground">Read-only timeline view</p>
        </div>
        <Link
          to="/register"
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Track yours free →
        </Link>
      </div>
    </header>
  );
}

function ApplicationsTimeline({ timeline }) {
  return (
    <>
      <h2 className="mb-6 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Applications ({timeline.applications.length})
      </h2>

      {timeline.applications.length === 0 ? (
        <p className="text-sm text-muted-foreground">No applications yet.</p>
      ) : (
        <div className="flex flex-col">
          {timeline.applications.map((app, i) => (
            <TimelineRow
              key={app.id}
              app={app}
              isLast={i === timeline.applications.length - 1}
            />
          ))}
        </div>
      )}
    </>
  );
}

function TimelineCTA() {
  return (
    <div className="mt-12 rounded-xl border border-primary/20 bg-primary/10 px-6 py-5 text-center">
      <p className="mb-1 font-semibold text-foreground">Track your own job search with Pipelined</p>
      <p className="mb-4 text-sm text-muted-foreground">One-click save from LinkedIn, Greenhouse, Lever, and more.</p>
      <Link
        to="/register"
        className="inline-block rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Get started — it's free
      </Link>
    </div>
  );
}

function PublicTimeline() {
  const { slug } = useParams();
  const { data, isLoading, isError } = usePublicTimeline(slug);

  useEffect(() => {
    trackEvent("timeline_share_viewed");
  }, []);

  useEffect(() => {
    if (!data) return;
    const timeline = data?.data ?? data;
    const title = `${timeline.display_name}'s Timeline — Pipelined`;
    document.title = title;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    return () => {
      document.title = "Pipelined — Job Application Tracker for Students & Engineers";
    };
  }, [data]);

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <NotFoundState />;

  const timeline = data?.data ?? data;

  return (
    <div className="min-h-screen bg-background">
      <TimelineHeader timeline={timeline} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <ApplicationsTimeline timeline={timeline} />
        <TimelineCTA />
      </main>
    </div>
  );
}

export default PublicTimeline;
