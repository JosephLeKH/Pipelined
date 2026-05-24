/** Weekly pipeline review metrics on the Today page. */

import { Link } from "react-router-dom";

import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import Ghost from "lucide-react/dist/esm/icons/ghost";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";

import { CARD_BASE } from "../lib/designTokens";

function MetricCard({ label, value, icon: Icon, description }) {
  return (
    <div className="rounded-lg border border-border bg-surface-secondary/40 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-foreground">{value}</p>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

function formatPercent(rate) {
  return `${Math.round(rate * 100)}%`;
}

function WeeklyReviewSection({ review, isLoading }) {
  if (isLoading) {
    return (
      <section aria-label="Weekly review" className={`${CARD_BASE} p-5 animate-pulse`}>
        <div className="h-5 w-40 rounded bg-muted" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="h-20 rounded-lg bg-muted" />
          <div className="h-20 rounded-lg bg-muted" />
          <div className="h-20 rounded-lg bg-muted" />
        </div>
      </section>
    );
  }

  if (!review) return null;

  const { response_rate: responseRate, ghost_rate: ghostRate, velocity, stale_applications: staleApps } = review;
  const velocityLabel = `${velocity.applied_this_week} / ${velocity.weekly_goal} applied`;

  return (
    <section aria-label="Weekly review" className={`${CARD_BASE} p-5 animate-fade-in-up`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Weekly review</h2>
          <p className="text-sm text-muted-foreground">Week of {review.week_start}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Response rate"
          value={formatPercent(responseRate)}
          icon={BarChart3}
          description="Applications that heard back"
        />
        <MetricCard
          label="Ghost rate"
          value={formatPercent(ghostRate)}
          icon={Ghost}
          description="Waiting past your median"
        />
        <MetricCard
          label="Velocity"
          value={velocityLabel}
          icon={TrendingUp}
          description={`${Math.round(velocity.percent_of_goal * 100)}% of weekly goal`}
        />
      </div>
      {staleApps.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-medium text-foreground">Stale applications</h3>
          <ul className="mt-2 space-y-2">
            {staleApps.slice(0, 5).map((app) => (
              <li key={app.id}>
                <Link
                  to={`/dashboard?selected=${app.id}`}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-surface-secondary"
                >
                  <span className="text-foreground">
                    {app.company} — {app.role_title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {app.days_since_update}d idle
                  </span>
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
