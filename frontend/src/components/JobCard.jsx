/** Card component for a job listing in the grid view of the job board. */

import MapPin from "lucide-react/dist/esm/icons/map-pin";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import Building2 from "lucide-react/dist/esm/icons/building-2";

import { formatDate } from "../lib/dateUtils";
import { CARD_BASE, BADGE_BASE, BUTTON_PRIMARY } from "../lib/designTokens";

const REMOTE_BADGE_COLORS = {
  remote: { bg: "bg-emerald-100", text: "text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  hybrid: { bg: "bg-brand-100", text: "text-brand-800 dark:bg-brand-900/30 dark:text-brand-300" },
  onsite: { bg: "bg-amber-100", text: "text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  unknown: { bg: "bg-slate-100", text: "text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
};

const DEFAULT_REMOTE_BADGE = { bg: "bg-slate-100", text: "text-slate-600" };

function RemoteBadge({ remoteStatus }) {
  const color = REMOTE_BADGE_COLORS[remoteStatus] ?? DEFAULT_REMOTE_BADGE;
  return (
    <span
      className={`${BADGE_BASE} ${color.bg} ${color.text}`}
    >
      {remoteStatus ?? "unknown"}
    </span>
  );
}

function JobCard({ job }) {
  const datePosted = job.date_posted ? formatDate(job.date_posted) : null;

  return (
    <article
      className={`flex flex-col gap-3 p-4 transition-all duration-150 hover:shadow-card-hover ${CARD_BASE}`}
      data-testid="job-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 leading-snug">
            {job.role ?? "Untitled Role"}
          </h3>
          <span className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
            <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {job.company ?? "Unknown Company"}
          </span>
        </div>
        {job.is_stale && (
          <span
            className={`shrink-0 ${BADGE_BASE} bg-amber-100 text-amber-800`}
            data-testid="stale-badge"
          >
            Stale
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {job.remote_status && <RemoteBadge remoteStatus={job.remote_status} />}
        {job.experience_level && (
          <span className={`${BADGE_BASE} bg-violet-100 text-violet-800`}>
            {job.experience_level}
          </span>
        )}
        {job.company_type && (
          <span className={`${BADGE_BASE} bg-slate-100 text-slate-700`}>
            {job.company_type}
          </span>
        )}
      </div>

      {(job.location || job.salary_range) && (
        <div className="flex flex-col gap-1 text-sm text-slate-500 dark:text-slate-400">
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
          <span className="text-xs text-slate-400 dark:text-slate-500">Posted {datePosted}</span>
        ) : (
          <span />
        )}
        {job.apply_url && (
          <a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-button shadow-sm hover:from-brand-700 hover:to-brand-600 active:scale-[0.98] transition-all duration-150 font-medium text-xs px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
