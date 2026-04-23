/** Card component for a job listing in the grid view of the job board. */

import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import MapPin from "lucide-react/dist/esm/icons/map-pin";

import CompanyLogo from "./CompanyLogo";
import { CARD_BASE, BADGE_BASE, BUTTON_PRIMARY, TAG } from "../lib/designTokens";
import { formatRelative } from "../lib/dateUtils";

const STALE_LABEL = "May be expired";
const TAG_PILL = `inline-flex items-center gap-1 ${TAG}`;

function JobCard({ job, onSelect }) {
  const dateLabel = job.date_posted ? formatRelative(job.date_posted) : null;

  return (
    <article
      className={`relative flex flex-col gap-3 p-4 transition-all duration-150 hover:shadow-card-hover cursor-pointer ${CARD_BASE}`}
      data-testid="job-card"
      onClick={() => onSelect?.(job)}
    >
      {job.is_stale && (
        <span
          className={`absolute right-3 top-3 ${BADGE_BASE} bg-amber-100 text-amber-800`}
          data-testid="stale-badge"
        >
          {STALE_LABEL}
        </span>
      )}

      {/* Top row: logo + company + timestamp */}
      <div className="flex items-center gap-2.5 pr-24">
        <CompanyLogo
          company_domain={job.company_domain ?? null}
          company={job.company ?? ""}
          size={32}
        />
        <span className="flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
          {job.company ?? "Unknown Company"}
        </span>
        {dateLabel && (
          <span className="shrink-0 text-xs text-gray-400">{dateLabel}</span>
        )}
      </div>

      {/* Role title */}
      <h3 className="pr-2 text-lg font-semibold leading-snug text-gray-900 dark:text-gray-100">
        {job.role ?? "Untitled Role"}
      </h3>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5">
        {job.location && (
          <span className={TAG_PILL}>
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            {job.location}
          </span>
        )}
        {job.remote_status && <span className={TAG_PILL}>{job.remote_status}</span>}
        {job.experience_level && <span className={TAG_PILL}>{job.experience_level}</span>}
        {job.company_type && <span className={TAG_PILL}>{job.company_type}</span>}
      </div>

      {/* Salary */}
      {job.salary_range && (
        <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <DollarSign className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {job.salary_range}
        </span>
      )}

      {/* Bottom: Apply + Bookmark */}
      <div className="mt-auto flex items-center justify-between pt-1">
        {job.apply_url ? (
          <a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 ${BUTTON_PRIMARY}`}
            aria-label={`Apply to ${job.role ?? "this role"} at ${job.company ?? "this company"}`}
          >
            Apply
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label="Bookmark job"
          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
        >
          <Bookmark className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

export default JobCard;
