/** Recommendation tile for job board — 160 px card with fit score and Track CTA. */

import { useCallback } from "react";
import { toast } from "sonner";

import FitBadge from "./FitBadge";
import { Button } from "./ui/button";
import { useCreateApplication } from "../hooks/useApplications";
import { cn } from "../lib/utils";
import { formatDateShort } from "../lib/dateUtils";
import { MS_PER_DAY } from "../lib/constants";

const TILE_FOCUS =
  "focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

function formatPostedCompact(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((todayStart - targetStart) / MS_PER_DAY);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1d ago";
  if (diffDays <= 30) return `${diffDays}d ago`;
  return formatDateShort(isoString);
}

function formatMetaLine(job) {
  const parts = [];
  if (job.location) {
    parts.push(job.location.split(" · ")[0]);
  }
  if (job.remote_status && job.remote_status !== "unknown") {
    parts.push(job.remote_status.charAt(0).toUpperCase() + job.remote_status.slice(1));
  }
  if (job.experience_level) {
    parts.push(
      job.experience_level
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    );
  }
  return parts.length > 0 ? parts.join(" · ") : "N/A";
}

function JobCard({ job, score, onSelect }) {
  const createMutation = useCreateApplication();
  const company = job.company ?? "Unknown Company";
  const role = job.role ?? "Untitled Role";
  const fitScore = score ?? job.score;
  const showFit = typeof fitScore === "number" && fitScore > 0;
  const posted = formatPostedCompact(job.date_posted);

  const handleTrack = useCallback(
    (event) => {
      event.stopPropagation();
      createMutation.mutate(
        {
          role_title: role,
          company,
          location: job.location ?? "",
          current_stage: "To Apply",
          source: "board",
          source_url: job.apply_url || undefined,
        },
        {
          onSuccess: () => toast.success(`Tracking ${company} · ${role}`),
          onError: () => toast.error("Failed to track job. Are you signed in?"),
        }
      );
    },
    [company, createMutation, job.apply_url, job.location, role]
  );

  return (
    <article
      className={cn(
        "relative flex min-h-40 flex-col overflow-hidden rounded-lg border border-border-1 bg-surface-0 p-4",
        "cursor-pointer hover:bg-surface-1 motion-reduce:transition-none transition-colors duration-[120ms] ease-out",
        TILE_FOCUS
      )}
      data-testid="job-card"
      tabIndex={0}
      aria-label={`Recommended: ${role} at ${company}`}
      onClick={() => onSelect?.(job)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(job);
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-[0.8125rem] font-medium text-text-1">{company}</span>
        {showFit && <FitBadge score={fitScore} />}
      </div>

      <p className="mt-1 line-clamp-3 text-[0.8125rem] leading-snug text-text-2">{role}</p>

      <p className="mt-1 truncate text-xs text-text-3">{formatMetaLine(job)}</p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <span className="min-w-0 truncate text-xs text-text-3">
          {posted ? `Posted ${posted}` : ""}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={createMutation.isPending}
          aria-label={`Track ${role} at ${company}`}
          onClick={handleTrack}
        >
          Track
        </Button>
      </div>
    </article>
  );
}

export default JobCard;
