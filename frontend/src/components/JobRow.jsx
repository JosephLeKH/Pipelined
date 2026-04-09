/** Compact row component for a job listing in the list view of the job board. */

import MapPin from "lucide-react/dist/esm/icons/map-pin";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";

import { formatDate } from "../lib/dateUtils";

const REMOTE_COLORS = {
  remote: "text-green-700",
  hybrid: "text-blue-700",
  onsite: "text-amber-700",
  unknown: "text-gray-500",
};

function JobRow({ job, style }) {
  const datePosted = job.date_posted ? formatDate(job.date_posted) : "—";

  const remoteColor = REMOTE_COLORS[job.remote_status] ?? "text-gray-500";

  return (
    <div
      style={style}
      className="flex items-center gap-4 border-b border-gray-100 px-4 hover:bg-gray-50"
      role="row"
      data-testid="job-row"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-gray-900">
            {job.role ?? "Untitled Role"}
          </span>
          <span className="truncate text-sm text-gray-500">
            {job.company ?? "Unknown Company"}
          </span>
        </div>

        {job.location && (
          <span className="hidden items-center gap-1 text-sm text-gray-500 md:flex">
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
          <span className="hidden shrink-0 text-sm text-gray-500 xl:block">
            {job.experience_level}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {job.salary_range && (
          <span className="hidden text-sm text-gray-500 lg:block">{job.salary_range}</span>
        )}
        <span className="hidden text-xs text-gray-400 sm:block">{datePosted}</span>
        {job.is_stale && (
          <span
            className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800"
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
            className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
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
