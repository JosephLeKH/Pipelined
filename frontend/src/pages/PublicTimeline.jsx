/** Read-only public timeline view with marketing chrome. */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { formatDate } from "../lib/dateUtils";
import { usePublicTimeline } from "../hooks/useSharing";
import { trackEvent } from "../lib/analytics";
import MarketingNav from "../components/marketing/MarketingNav";
import MarketingFooter from "../components/marketing/MarketingFooter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

const INTERVIEW_STAGES = new Set(["Phone Screen", "Onsite", "Technical", "Final Round", "Interview"]);
const SKELETON_ROW_COUNT = 4;

function StagePill({ stage }) {
  const color = STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
      {stage}
    </span>
  );
}

function countInterviews(applications) {
  return applications.filter((app) => INTERVIEW_STAGES.has(app.current_stage)).length;
}

function countOffers(applications) {
  return applications.filter((app) => app.current_stage === "Offer").length;
}

function PublicTrackCTA() {
  return (
    <div className="flex flex-col items-start justify-between gap-3 border-y border-border-1 bg-brand-50 px-4 py-4 sm:flex-row sm:items-center">
      <p className="text-sm font-medium text-brand-700">Want to track yours?</p>
      <Link
        to="/register"
        className="marketing-focus inline-flex h-9 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-medium text-white transition-colors duration-120 hover:bg-brand-800"
      >
        Track yours →
      </Link>
    </div>
  );
}

function TimelineMetadata({ timeline }) {
  const total = timeline.applications.length;
  const interviews = countInterviews(timeline.applications);
  const offers = countOffers(timeline.applications);

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-text-3">
        {timeline.display_name} · Job search timeline
      </p>
      <p className="text-base font-semibold text-text-1">
        {total} applications · {interviews} interviews · {offers} offers
      </p>
    </div>
  );
}

function TimelineRow({ app, isLast, onSelect }) {
  const hasProgressed = app.stage_history && app.stage_history.length > 1;

  return (
    <button
      type="button"
      className="marketing-focus flex w-full gap-4 text-left"
      onClick={() => onSelect(app)}
    >
      <div className="flex flex-col items-center">
        <div className="h-3 w-3 rounded-full border-2 border-brand-700 bg-surface-0" />
        {!isLast && <div className="w-0.5 flex-1 bg-border-1" />}
      </div>

      <div className="flex flex-1 flex-col gap-1 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-text-1">{app.company}</span>
          <span className="text-text-3">·</span>
          <span className="text-sm text-text-2">{app.role_title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-3">{formatDate(app.date_applied)}</span>
          <StagePill stage={app.current_stage} />
        </div>
        {hasProgressed && (
          <div className="mt-1 flex flex-wrap gap-1">
            {app.stage_history.map((entry, i) => (
              <span
                key={i}
                className="rounded bg-surface-1 px-1.5 py-0.5 text-xs text-text-3"
              >
                {entry.stage ?? entry}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-surface-0">
      <MarketingNav />
      <div className="mx-auto max-w-6xl px-6 py-8" aria-hidden="true">
        <div className="mb-6 flex flex-col gap-2">
          <div className="h-4 w-48 rounded shimmer-bg animate-shimmer" />
          <div className="h-5 w-64 rounded shimmer-bg animate-shimmer" />
        </div>
        <div className="flex flex-col">
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
            <div key={i} className="flex gap-4 pb-6">
              <div className="h-3 w-3 rounded-full shimmer-bg animate-shimmer" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-28 rounded shimmer-bg animate-shimmer" />
                <div className="h-3 w-20 rounded shimmer-bg animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="min-h-screen bg-surface-0">
      <MarketingNav />
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-6 py-24">
        <h1 className="text-2xl font-semibold text-text-1">Link not found</h1>
        <p className="text-text-2">This timeline link has expired or been revoked.</p>
        <Link to="/" className="marketing-focus text-sm font-medium text-brand-700 hover:text-brand-800">
          Go to Pipelined →
        </Link>
      </div>
      <MarketingFooter />
    </div>
  );
}

function ApplicationsTimeline({ timeline, onRowSelect }) {
  return (
    <section aria-label="Timeline">
      <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-text-3">
        Applications ({timeline.applications.length})
      </h2>

      {timeline.applications.length === 0 ? (
        <p className="text-sm text-text-2">No applications yet.</p>
      ) : (
        <div className="flex flex-col">
          {timeline.applications.map((app, i) => (
            <TimelineRow
              key={app.id}
              app={app}
              isLast={i === timeline.applications.length - 1}
              onSelect={onRowSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PublicTimeline() {
  const { slug } = useParams();
  const { data, isLoading, isError } = usePublicTimeline(slug);
  const [detailOpen, setDetailOpen] = useState(false);

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

    const descContent = `${timeline.display_name}'s job search timeline — tracked with Pipelined`;
    let descMeta = document.querySelector('meta[name="description"]');
    if (!descMeta) {
      descMeta = document.createElement("meta");
      descMeta.name = "description";
      document.head.appendChild(descMeta);
    }
    descMeta.content = descContent;

    let ogDescMeta = document.querySelector('meta[property="og:description"]');
    if (!ogDescMeta) {
      ogDescMeta = document.createElement("meta");
      ogDescMeta.setAttribute("property", "og:description");
      document.head.appendChild(ogDescMeta);
    }
    ogDescMeta.content = descContent;

    return () => {
      document.title = "Pipelined — Job Application Tracker for Students & Engineers";
      const cleanDescMeta = document.querySelector('meta[name="description"]');
      if (cleanDescMeta) cleanDescMeta.content = "";
      const cleanOgDescMeta = document.querySelector('meta[property="og:description"]');
      if (cleanOgDescMeta) cleanOgDescMeta.content = "";
    };
  }, [data]);

  const timeline = useMemo(() => (data?.data ?? data) || null, [data]);

  if (isLoading) return <LoadingState />;
  if (isError || !timeline) return <NotFoundState />;

  return (
    <div className="min-h-screen bg-surface-0">
      <MarketingNav />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
        <TimelineMetadata timeline={timeline} />
        <PublicTrackCTA />
        <ApplicationsTimeline timeline={timeline} onRowSelect={() => setDetailOpen(true)} />
      </main>
      <MarketingFooter />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign up to see details</DialogTitle>
            <DialogDescription>
              Create a free account to track milestones, open detail panels, and share your own timeline.
            </DialogDescription>
          </DialogHeader>
          <Link
            to="/register"
            className="marketing-focus inline-flex h-9 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-800"
            onClick={() => setDetailOpen(false)}
          >
            Sign up free
          </Link>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PublicTimeline;
