/** Read-only public timeline view for a shared timeline slug. */

import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";

import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { formatDate } from "../lib/dateUtils";
import { usePublicTimeline } from "../hooks/useSharing";
import { trackEvent } from "../lib/analytics";
import { SPINNER_LG } from "../lib/designTokens";

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
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className="h-3 w-3 rounded-full border-2 border-brand-500 bg-white" />
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200" />}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-900">{app.company}</span>
          <span className="text-gray-400">·</span>
          <span className="text-sm text-gray-600">{app.role_title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">{formatDate(app.date_applied)}</span>
          <StagePill stage={app.current_stage} />
        </div>
        {hasProgressed && (
          <div className="mt-1 flex flex-wrap gap-1">
            {app.stage_history.map((entry, i) => (
              <span
                key={i}
                className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500"
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
      <div className={SPINNER_LG} />
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="font-display text-2xl font-bold text-gray-800">Link not found</h1>
      <p className="text-gray-500">This timeline link has expired or been revoked.</p>
      <Link to="/" className="text-brand-600 hover:underline">Go to Pipelined →</Link>
    </div>
  );
}

function TimelineHeader({ timeline }) {
  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900">{timeline.display_name}'s Job Search</h1>
          <p className="text-sm text-gray-500">Read-only timeline view</p>
        </div>
        <Link
          to="/register"
          className="rounded bg-brand-500 px-3 py-1.5 text-sm text-white hover:bg-brand-600"
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
      <h2 className="mb-6 font-display text-sm font-semibold uppercase tracking-wide text-gray-500">
        Applications ({timeline.applications.length})
      </h2>

      {timeline.applications.length === 0 ? (
        <p className="text-sm text-gray-400">No applications yet.</p>
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
    <div className="mt-12 rounded-xl border border-brand-100 bg-brand-50 px-6 py-5 text-center">
      <p className="mb-1 font-semibold text-brand-900">Track your own job search with Pipelined</p>
      <p className="mb-4 text-sm text-brand-700">One-click save from LinkedIn, Greenhouse, Lever, and more.</p>
      <Link
        to="/register"
        className="inline-block rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600"
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
    <div className="min-h-screen bg-surface-secondary">
      <TimelineHeader timeline={timeline} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <ApplicationsTimeline timeline={timeline} />
        <TimelineCTA />
      </main>
    </div>
  );
}

export default PublicTimeline;
