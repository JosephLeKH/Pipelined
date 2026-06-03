/** Weekly pipeline review metrics and Sunday teaser on the Today page. */

import { Link } from "react-router-dom";

import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import Ghost from "lucide-react/dist/esm/icons/ghost";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";

import { formatWeeklyReviewTeaser } from "../lib/todayUtils";

function MetricRow({ label, value, icon: Icon, description }) {
  return (
    <div className="rounded-lg border border-border-1 bg-surface-1/40 p-4">
      <div className="flex items-center gap-2 text-text-3">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-text-1">{value}</p>
      {description && <p className="mt-1 text-xs text-text-3">{description}</p>}
    </div>
  );
}

function formatPercent(rate) {
  return `${Math.round(rate * 100)}%`;
}

export function WeeklyReviewTeaser({ review, isLoading, onReadReview }) {
  if (isLoading) {
    return (
      <section aria-label="Weekly review" className="animate-pulse">
        <div className="mb-2 h-3 w-36 rounded bg-surface-2" />
        <div className="h-12 rounded-lg bg-surface-1" />
      </section>
    );
  }

  if (!review) return null;

  return (
    <section aria-label="Weekly review">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-3">
        This week&apos;s review
      </h2>
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 rounded-lg border border-border-1 bg-surface-1 p-4">
        <p className="text-sm text-text-2">{formatWeeklyReviewTeaser(review)}</p>
        <button
          type="button"
          onClick={onReadReview}
          className={[
            "shrink-0 text-sm text-brand-600 hover:underline",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600",
            "dark:focus-visible:outline-1",
          ].join(" ")}
        >
          Read your Sunday review →
        </button>
      </div>
    </section>
  );
}

function WeeklyReviewSection({ review, isLoading, error }) {
  if (isLoading) {
    return (
      <section aria-label="Weekly review" className="animate-pulse rounded-lg border border-border-1 bg-surface-1 p-5">
        <div className="h-4 w-40 rounded bg-surface-2" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="h-20 rounded-lg bg-surface-2" />
          <div className="h-20 rounded-lg bg-surface-2" />
          <div className="h-20 rounded-lg bg-surface-2" />
        </div>
      </section>
    );
  }

  if (error?.status === 404) {
    return (
      <section aria-label="Weekly review" className="rounded-lg border border-border-1 bg-surface-1 p-5">
        <div className="mb-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-3">Weekly review</h2>
        </div>
        <div className="rounded-lg border border-border-2 bg-surface-1 px-4 py-3">
          <p className="text-sm text-text-2">No weekly review yet — your first review will appear at the end of the week.</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="Weekly review" className="rounded-lg border border-border-1 bg-surface-1 p-5">
        <div className="mb-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-3">Weekly review</h2>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="flex-1 text-sm text-destructive">Couldn&apos;t load weekly review — try again</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="shrink-0 text-sm text-brand-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!review) return null;

  const { response_rate: responseRate, ghost_rate: ghostRate, velocity, stale_applications: staleApps } = review;
  const velocityLabel = `${velocity.applied_this_week} / ${velocity.weekly_goal} applied`;

  return (
    <section aria-label="Weekly review" className="rounded-lg border border-border-1 bg-surface-1 p-5">
      <div className="mb-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-3">Weekly review</h2>
        <p className="mt-1 text-sm text-text-2">Week of {review.week_start}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricRow
          label="Response rate"
          value={formatPercent(responseRate)}
          icon={BarChart3}
          description="Applications that heard back"
        />
        <MetricRow
          label="Ghost rate"
          value={formatPercent(ghostRate)}
          icon={Ghost}
          description="Waiting past your median"
        />
        <MetricRow
          label="Velocity"
          value={velocityLabel}
          icon={TrendingUp}
          description={`${Math.round(velocity.percent_of_goal * 100)}% of weekly goal`}
        />
      </div>
      {staleApps.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-text-3">Stale applications</h3>
          <ul className="mt-2 divide-y divide-border-1">
            {staleApps.slice(0, 5).map((app) => (
              <li key={app.id}>
                <Link
                  to={`/applications/${app.id}`}
                  className={[
                    "flex items-center justify-between px-2 py-2 text-sm hover:bg-surface-2",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600",
                    "dark:focus-visible:outline-1",
                  ].join(" ")}
                >
                  <span className="text-text-1">
                    {app.company} · {app.role_title}
                  </span>
                  <span className="text-xs text-text-3">{app.days_since_update}d idle</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default WeeklyReviewSection;
