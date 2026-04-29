/** "Recommended for You" strip on the Job Board page. */

import { useContext } from "react";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";

import JobCard from "./JobCard";
import { useRecommendedJobs } from "../hooks/useJobs";
import { AuthContext } from "../context/AuthContext";

const SECTION_TITLE = "Recommended for You";

function ReasonBadge({ reason }) {
  return (
    <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
      {reason}
    </span>
  );
}

function RecommendationCard({ job, onSelect }) {
  return (
    <div className="flex flex-col">
      <JobCard job={job} onSelect={onSelect} />
      <ReasonBadge reason={job.reason} />
    </div>
  );
}

export function JobRecommendations({ onSelectJob }) {
  const ctx = useContext(AuthContext);
  const user = ctx?.user ?? null;
  const { data: jobs, isLoading, isError } = useRecommendedJobs(Boolean(user));

  if (!user || isError || (!isLoading && (!jobs || jobs.length === 0))) return null;

  return (
    <section aria-labelledby="recommendations-heading" className="flex flex-col gap-3">
      <h2 id="recommendations-heading" className="flex items-center gap-1.5 font-display text-sm font-semibold text-gray-700">
        <Sparkles className="h-4 w-4 text-brand-500" aria-hidden="true" />
        {SECTION_TITLE}
      </h2>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700" aria-hidden="true" />
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
