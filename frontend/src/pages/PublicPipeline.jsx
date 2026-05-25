/** Read-only public pipeline view with marketing chrome. */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { formatDateShort } from "../lib/dateUtils";
import { usePublicPipeline } from "../hooks/useSharing";
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

const STAGE_ORDER = ["To Apply", "Applied", "Phone Screen", "Onsite", "Offer", "Rejected"];
const INTERVIEW_STAGES = new Set(["Phone Screen", "Onsite", "Technical", "Final Round", "Interview"]);
const SKELETON_ROW_COUNT = 5;

function countByStage(applications) {
  const counts = {};
  for (const app of applications) {
    const stage = app.current_stage || "Unknown";
    counts[stage] = (counts[stage] ?? 0) + 1;
  }
  return counts;
}

function orderedStageCounts(counts) {
  const seen = new Set();
  const rows = STAGE_ORDER.filter((stage) => counts[stage]).map((stage) => {
    seen.add(stage);
    return { stage, count: counts[stage] };
  });
  for (const [stage, count] of Object.entries(counts)) {
    if (!seen.has(stage)) rows.push({ stage, count });
  }
  return rows;
}

function countInterviews(applications) {
  return applications.filter((app) => INTERVIEW_STAGES.has(app.current_stage)).length;
}

function countOffers(applications) {
  return applications.filter((app) => app.current_stage === "Offer").length;
}

function StageDot({ stage }) {
  const color = STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR;
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${color.dot}`} aria-hidden="true" />;
}

function StageStrip({ applications }) {
  const stages = orderedStageCounts(countByStage(applications));
  if (stages.length === 0) return null;

  return (
    <section aria-label="Pipeline stages" className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-3">Pipeline stages</h2>
      <div className="-mx-6 overflow-x-auto px-6">
        <div className="flex w-max min-w-full gap-2 pb-1">
          {stages.map(({ stage, count }) => (
            <span
              key={stage}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border-1 bg-surface-1 px-3 py-1.5 text-[13px] font-medium text-text-1"
            >
              <StageDot stage={stage} />
              {stage}
              <span className="text-text-3">· {count}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function PublicReadOnlyRow({ app, onSelect }) {
  return (
    <button
      type="button"
      className="marketing-focus flex h-10 w-full items-center gap-3 border-b border-border-1 px-2 text-left transition-colors duration-120 hover:bg-surface-1"
      onClick={() => onSelect(app)}
    >
      <span className="w-36 truncate text-sm font-medium text-text-1">{app.company}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-text-2">{app.role_title}</span>
      <span className="hidden shrink-0 rounded-md border border-border-1 bg-surface-1 px-2 py-0.5 text-xs font-medium text-text-1 sm:inline-flex sm:items-center sm:gap-1.5">
        <StageDot stage={app.current_stage} />
        {app.current_stage}
      </span>
      <span className="w-20 shrink-0 text-right text-sm text-text-3">{formatDateShort(app.date_applied)}</span>
    </button>
  );
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

function PublicMetadata({ pipeline }) {
  const total = pipeline.stats?.total_applied ?? pipeline.applications.length;
  const interviews = countInterviews(pipeline.applications);
  const offers = countOffers(pipeline.applications);

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-text-3">
        {pipeline.display_name} · Job search pipeline
      </p>
      <p className="text-base font-semibold text-text-1">
        {total} applications · {interviews} interviews · {offers} offers
      </p>
    </div>
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
        <div className="flex flex-col divide-y divide-border-1 rounded-xl border border-border-1">
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
            <div key={i} className="flex h-10 items-center gap-4 px-2">
              <div className="h-4 w-32 rounded shimmer-bg animate-shimmer" />
              <div className="h-4 flex-1 rounded shimmer-bg animate-shimmer" />
              <div className="h-4 w-20 rounded shimmer-bg animate-shimmer" />
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
        <p className="text-text-2">This pipeline link has expired or been revoked.</p>
        <Link to="/" className="marketing-focus text-sm font-medium text-brand-700 hover:text-brand-800">
          Go to Pipelined →
        </Link>
      </div>
      <MarketingFooter />
    </div>
  );
}

function ApplicationsSection({ pipeline, onRowSelect }) {
  return (
    <section aria-label="Applications" className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-3">
        Applications ({pipeline.applications.length})
      </h2>
      {pipeline.applications.length === 0 ? (
        <p className="text-sm text-text-2">No applications yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-1 bg-surface-0">
          {pipeline.applications.map((app) => (
            <PublicReadOnlyRow key={app.id} app={app} onSelect={onRowSelect} />
          ))}
        </div>
      )}
    </section>
  );
}

function PublicPipeline() {
  const { slug } = useParams();
  const { data, isLoading, isError } = usePublicPipeline(slug);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    trackEvent("share_link_viewed");
  }, []);

  useEffect(() => {
    if (!data) return;
    const pipeline = data?.data ?? data;
    const title = `${pipeline.display_name}'s Pipeline | Pipelined`;
    document.title = title;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);

    const descContent = `${pipeline.display_name}'s job application pipeline, tracked with Pipelined`;
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
      document.title = "Pipelined | Job Application Tracker for Students & Engineers";
      const cleanDescMeta = document.querySelector('meta[name="description"]');
      if (cleanDescMeta) cleanDescMeta.content = "";
      const cleanOgDescMeta = document.querySelector('meta[property="og:description"]');
      if (cleanOgDescMeta) cleanOgDescMeta.content = "";
    };
  }, [data]);

  const pipeline = useMemo(() => (data?.data ?? data) || null, [data]);

  if (isLoading) return <LoadingState />;
  if (isError || !pipeline) return <NotFoundState />;

  return (
    <div className="min-h-screen bg-surface-0">
      <MarketingNav />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
        <PublicMetadata pipeline={pipeline} />
        <PublicTrackCTA />
        <StageStrip applications={pipeline.applications} />
        <ApplicationsSection pipeline={pipeline} onRowSelect={() => setDetailOpen(true)} />
      </main>
      <MarketingFooter />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign up to see details</DialogTitle>
            <DialogDescription>
              Create a free account to track applications, open detail panels, and share your own pipeline.
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

export default PublicPipeline;
