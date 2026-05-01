/** Card component for a job listing in the grid view of the job board. */

import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import MapPin from "lucide-react/dist/esm/icons/map-pin";

import CompanyLogo from "./CompanyLogo";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { formatRelative } from "../lib/dateUtils";

const TAG_PILL = "inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground text-xs px-2 py-0.5";

function JobCard({ job, onSelect }) {
  const dateLabel = job.date_posted ? formatRelative(job.date_posted) : null;

  return (
    <article
      className="relative flex flex-col gap-3 p-4 transition-all duration-150 hover:shadow-md cursor-pointer rounded-xl border border-border bg-card text-card-foreground shadow-sm"
      data-testid="job-card"
      onClick={() => onSelect?.(job)}
    >
      {job.is_stale && (
        <Badge
          variant="warning"
          className="absolute right-3 top-3"
          data-testid="stale-badge"
        >
          May be expired
        </Badge>
      )}

      {/* Top row: logo + company + timestamp */}
      <div className="flex items-center gap-2.5 pr-24">
        <CompanyLogo
          company_domain={job.company_domain ?? null}
          company={job.company ?? ""}
          size={32}
        />
        <span className="flex-1 truncate font-display font-medium text-foreground text-sm">
          {job.company ?? "Unknown Company"}
        </span>
        {dateLabel && (
          <span className="shrink-0 text-xs text-muted-foreground">{dateLabel}</span>
        )}
      </div>

      {/* Role title */}
      <h3 className="pr-2 text-base font-semibold font-display leading-snug text-foreground">
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
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <DollarSign className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {job.salary_range}
        </span>
      )}

      {/* Bottom: Apply + Bookmark */}
      <div className="mt-auto flex items-center justify-between pt-1">
        {job.apply_url ? (
          <Button asChild size="sm" className="flex items-center gap-1 text-xs">
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Apply to ${job.role ?? "this role"} at ${job.company ?? "this company"}`}
            >
              Apply
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => e.stopPropagation()}
          aria-label="Bookmark job"
          className="rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Bookmark className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}

export default JobCard;
