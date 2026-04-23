/** Read-only public pipeline view for a shared slug. */

import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";

import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { formatDate } from "../lib/dateUtils";
import { usePublicPipeline } from "../hooks/useSharing";
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

function StatCard({ label, value }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-gray-200 px-4 py-3">
      <span className="text-2xl font-bold text-gray-900">{value ?? "—"}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function PublicStatsBar({ stats }) {
  const responseRatePct = stats.response_rate != null
    ? `${Math.round(stats.response_rate * 100)}%`
    : null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Total Applied" value={stats.total_applied} />
      <StatCard label="Active" value={stats.active_count} />
      <StatCard label="Response Rate" value={responseRatePct} />
      <StatCard label="Avg Days to Response" value={stats.avg_days_to_first_response} />
    </div>
  );
}

function PublicAppRow({ app }) {
  return (
    <div className="flex items-center gap-4 rounded border border-gray-100 px-4 py-3">
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <span className="truncate font-medium text-gray-900">{app.company}</span>
        <span className="truncate text-sm text-gray-600">{app.role_title}</span>
      </div>
      <StagePill stage={app.current_stage} />
      <span className="hidden text-sm text-gray-500 sm:block">{formatDate(app.date_applied)}</span>
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
      <p className="text-gray-500">This pipeline link has expired or been revoked.</p>
      <Link to="/" className="text-brand-600 hover:underline">Go to Pipelined →</Link>
    </div>
  );
}

function PipelineHeader({ pipeline }) {
  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900">{pipeline.display_name}'s Pipeline</h1>
          <p className="text-sm text-gray-500">Read-only view</p>
        </div>
        <Link
          to="/register"
          className="rounded bg-brand-500 px-3 py-1.5 text-sm text-white hover:bg-brand-600"
        >
          Join Pipelined →
        </Link>
      </div>
    </header>
  );
}

function ApplicationsSection({ pipeline }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-8 flex flex-col gap-8">
      <section aria-label="Stats">
        <PublicStatsBar stats={pipeline.stats} />
      </section>

      <section aria-label="Applications">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-gray-500">
          Applications ({pipeline.applications.length})
        </h2>
        {pipeline.applications.length === 0 ? (
          <p className="text-sm text-gray-400">No applications yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {pipeline.applications.map((app) => (
              <PublicAppRow key={app.id} app={app} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function PublicPipeline() {
  const { slug } = useParams();
  const { data, isLoading, isError } = usePublicPipeline(slug);

  useEffect(() => {
    trackEvent("share_link_viewed");
  }, []);

  useEffect(() => {
    if (!data) return;
    const pipeline = data?.data ?? data;
    const title = `${pipeline.display_name}'s Pipeline — Pipelined`;
    document.title = title;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    return () => {
      document.title = "Pipelined — Job Application Tracker for Students & Engineers";
    };
  }, [data]);

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <NotFoundState />;

  const pipeline = data?.data ?? data;

  return (
    <div className="min-h-screen bg-gray-50">
      <PipelineHeader pipeline={pipeline} />
      <ApplicationsSection pipeline={pipeline} />
    </div>
  );
}

export default PublicPipeline;
