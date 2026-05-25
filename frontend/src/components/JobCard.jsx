/** Recommendation tile for job board — 160 px card with fit score and Track CTA. */

import { useCallback } from "react";
import { toast } from "sonner";

import FitBadge from "./FitBadge";
import { Button } from "./ui/button";
import { useCreateApplication } from "../hooks/useApplications";
import { cn } from "../lib/utils";

const TILE_FOCUS =
  "focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

function formatMetaLine(job) {
  const parts = [];
  if (job.location) {
    parts.push(job.location.split(" · ")[0]);
  }
  if (job.remote_status && job.remote_status !== "unknown") {
    parts.push(job.remote_status.charAt(0).toUpperCase() + job.remote_status.slice(1));
  }
  if (job.experience_level) {
    parts.push(job.experience_level.replace(/_/g, " "));
  }
  return parts.length > 0 ? parts.join(" · ") : "N/A";
}

function JobCard({ job, score, onSelect }) {
  const createMutation = useCreateApplication();
  const company = job.company ?? "Unknown Company";
  const role = job.role ?? "Untitled Role";
  const fitScore = score ?? job.score;
  const showFit = typeof fitScore === "number" && fitScore > 0;

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
        "relative flex h-40 flex-col rounded-lg border border-border-1 bg-surface-0 p-4",
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
        <span className="min-w-0 truncate text-[13px] font-medium text-text-1">{company}</span>
        {showFit && <FitBadge score={fitScore} />}
      </div>

      <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-text-2">{role}</p>

      <p className="mt-1 truncate text-xs text-text-3">{formatMetaLine(job)}</p>

      <div className="mt-auto pt-2">
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
