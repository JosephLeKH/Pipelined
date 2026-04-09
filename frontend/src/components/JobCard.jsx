/** Card component for a job listing in the grid view of the job board. */

import MapPin from "lucide-react/dist/esm/icons/map-pin";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import Building2 from "lucide-react/dist/esm/icons/building-2";

import { formatDate } from "../lib/dateUtils";

const REMOTE_BADGE_COLORS = {
  remote: { bg: "bg-green-100", text: "text-green-800" },
  hybrid: { bg: "bg-blue-100", text: "text-blue-800" },
  onsite: { bg: "bg-amber-100", text: "text-amber-800" },
  unknown: { bg: "bg-gray-100", text: "text-gray-800" },
};

const DEFAULT_REMOTE_BADGE = { bg: "bg-gray-100", text: "text-gray-800" };

function RemoteBadge({ remoteStatus }) {
  const color = REMOTE_BADGE_COLORS[remoteStatus] ?? DEFAULT_REMOTE_BADGE;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}
    >
      {remoteStatus ?? "unknown"}
    </span>
  );
}

function JobCard({ job }) {
  const datePosted = job.date_posted ? formatDate(job.date_posted) : null;

  return (
    <article
      className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
      data-testid="job-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-semibold text-gray-900 leading-snug">
            {job.role ?? "Untitled Role"}
          </h3>
          <span className="flex items-center gap-1 text-sm text-gray-600">
            <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {job.company ?? "Unknown Company"}
          </span>
        </div>
        {job.is_stale && (
          <span
            className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
            data-testid="stale-badge"
          >
            Stale
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {job.remote_status && <RemoteBadge remoteStatus={job.remote_status} />}
        {job.experience_level && (
          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
            {job.experience_level}
          </span>
        )}
        {job.company_type && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
            {job.company_type}
          </span>
        )}
      </div>

      {(job.location || job.salary_range) && (
        <div className="flex flex-col gap-1 text-sm text-gray-500">
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {job.location}
            </span>
          )}
          {job.salary_range && <span>{job.salary_range}</span>}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-1">
        {datePosted ? (
          <span className="text-xs text-gray-400">Posted {datePosted}</span>
        ) : (
          <span />
        )}
        {job.apply_url && (
          <a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            aria-label={`Apply to ${job.role ?? "this role"} at ${job.company ?? "this company"}`}
          >
            Apply
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}

export default JobCard;
