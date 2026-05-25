/** Compact row component for a job listing in the list view of the job board. */

import MapPin from "lucide-react/dist/esm/icons/map-pin";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";

import { formatDate } from "../lib/dateUtils";

const REMOTE_COLORS = {
  remote: "text-primary",
  hybrid: "text-primary",
  onsite: "text-amber-600 dark:text-amber-400",
  unknown: "text-muted-foreground",
};

function JobRow({ job, style }) {
  const datePosted = job.date_posted ? formatDate(job.date_posted) : "—";

  const remoteColor = REMOTE_COLORS[job.remote_status] ?? "text-muted-foreground";

  return (
    <div
      style={style}
      className="flex min-h-[var(--row-height)] items-center gap-4 border-b border-border px-4 motion-reduce:transition-none transition-colors hover:bg-muted"
      role="row"
      data-testid="job-row"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-foreground">
            {job.role ?? "Untitled Role"}
          </span>
          <span className="truncate text-sm text-muted-foreground">
            {job.company ?? "Unknown Company"}
          </span>
        </div>

        {job.location && (
          <span className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{job.location}</span>
          </span>
        )}

        {job.remote_status && (
          <span className={`hidden shrink-0 text-sm font-medium lg:block ${remoteColor}`}>
            {job.remote_status}
          </span>
        )}

        {job.experience_level && (
          <span className="hidden shrink-0 text-sm text-muted-foreground xl:block">
            {job.experience_level}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {job.salary_range && (
          <span className="hidden text-sm text-muted-foreground lg:block">{job.salary_range}</span>
        )}
        <span className="hidden text-xs text-muted-foreground sm:block">{datePosted}</span>
        {job.is_stale && (
          <span
            className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
            data-testid="stale-badge"
          >
            Stale
          </span>
        )}
        {job.apply_url ? (
          <a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md bg-primary text-primary-foreground text-xs px-2.5 py-1 font-medium transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`Apply to ${job.role ?? "this role"} at ${job.company ?? "this company"}`}
          >
            Apply
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : (
          <span className="w-14" />
        )}
      </div>
    </div>
  );
}

export default JobRow;
