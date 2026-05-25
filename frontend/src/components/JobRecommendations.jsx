/** "Recommended for you" tile grid on the Job Board page. */

import { useContext } from "react";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";

import JobCard from "./JobCard";
import { useRecommendedJobs } from "../hooks/useJobs";
import { AuthContext } from "../context/AuthContext";
import { BUTTON_SECONDARY } from "../lib/designTokens";

const SECTION_TITLE = "Recommended for you";
const SECTION_SUBTITLE = "based on your resume";
const RECOMMENDATION_LIMIT = 3;
const SKELETON_COUNT = 3;

function RecommendationsError({ onRetry }) {
  return (
    <div className="rounded-lg border border-border-1 bg-surface-1/50 px-4 py-6 text-center">
      <p className="text-sm text-text-3">Could not load recommendations.</p>
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

function RecommendationSkeleton() {
  return (
    <div
      className="h-40 animate-pulse rounded-lg border border-border-1 bg-surface-1/50"
      aria-hidden="true"
      data-testid="recommendation-skeleton"
    />
  );
}

function SectionHeader() {
  return (
    <header className="flex items-baseline gap-2">
      <h2 id="recommendations-heading" className="text-sm font-semibold text-text-1">
        {SECTION_TITLE}
      </h2>
      <p className="text-xs text-text-3">{SECTION_SUBTITLE}</p>
    </header>
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
        <SectionHeader />
        <RecommendationsError onRetry={() => refetch()} />
      </section>
    );
  }

  if (!isLoading && (!jobs || jobs.length === 0)) return null;

  const visibleJobs = jobs?.slice(0, RECOMMENDATION_LIMIT) ?? [];

  return (
    <section aria-labelledby="recommendations-heading" className="flex flex-col gap-3">
      <SectionHeader />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: SKELETON_COUNT }, (_, i) => <RecommendationSkeleton key={i} />)
          : visibleJobs.map((job) => (
              <JobCard key={job.id} job={job} onSelect={onSelectJob} />
            ))}
      </div>
    </section>
  );
}
