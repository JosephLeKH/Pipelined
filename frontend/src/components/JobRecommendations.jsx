/** "Recommended for You" strip on the Job Board page. */

import { useContext } from "react";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";

import JobCard from "./JobCard";
import FitBadge from "./FitBadge";
import { useRecommendedJobs } from "../hooks/useJobs";
import { AuthContext } from "../context/AuthContext";
import { FIT_SCORE_LABEL } from "../lib/aiConstants";
import { BUTTON_SECONDARY } from "../lib/designTokens";

const SECTION_TITLE = "Recommended for You";
const SECTION_SUBTITLE = "Ranked by your resume keywords";

function ReasonBadge({ reason }) {
  return (
    <span className="inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
      {reason}
    </span>
  );
}

function RecommendationCard({ job, onSelect }) {
  return (
    <div className="flex flex-col gap-1">
      <JobCard job={job} onSelect={onSelect} />
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-xs text-muted-foreground">{FIT_SCORE_LABEL}</span>
        <FitBadge score={job.score} />
        {job.reason && <ReasonBadge reason={job.reason} />}
      </div>
    </div>
  );
}

function RecommendationsError({ onRetry }) {
  return (
    <div className="rounded-xl border border-border-default bg-surface-secondary/50 px-4 py-6 text-center">
      <p className="text-sm text-muted-foreground">Could not load recommendations.</p>
      <button
        type="button"
        onClick={onRetry}
        className={`${BUTTON_SECONDARY} mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs`}
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}

export function JobRecommendations({ onSelectJob }) {
  const ctx = useContext(AuthContext);
  const user = ctx?.user ?? null;
  const { data: jobs, isLoading, isError, refetch } = useRecommendedJobs(Boolean(user));

  if (!user) return null;

  if (isError) {
    return (
      <section aria-labelledby="recommendations-heading" className="flex flex-col gap-3">
        <header>
          <h2 id="recommendations-heading" className="flex items-center gap-1.5 font-display text-sm font-semibold text-foreground">
            <TrendingUp className="h-4 w-4 text-brand-500" aria-hidden="true" />
            {SECTION_TITLE}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{SECTION_SUBTITLE}</p>
        </header>
        <RecommendationsError onRetry={() => refetch()} />
      </section>
    );
  }

  if (!isLoading && (!jobs || jobs.length === 0)) return null;

  return (
    <section aria-labelledby="recommendations-heading" className="flex flex-col gap-3">
      <header>
        <h2 id="recommendations-heading" className="flex items-center gap-1.5 font-display text-sm font-semibold text-foreground">
          <TrendingUp className="h-4 w-4 text-brand-500" aria-hidden="true" />
          {SECTION_TITLE}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{SECTION_SUBTITLE}</p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" aria-hidden="true" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {jobs.map((job) => (
            <RecommendationCard key={job.id} job={job} onSelect={onSelectJob} />
          ))}
        </div>
      )}
    </section>
  );
}
