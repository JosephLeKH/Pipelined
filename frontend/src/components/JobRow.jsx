/** Compact 40 px row for job board list — Linear dense layout matching ApplicationRow. */

import { useCallback } from "react";
import { toast } from "sonner";

import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import Plus from "lucide-react/dist/esm/icons/plus";

import CompanyLogo from "./CompanyLogo";
import { Button } from "./ui/button";
import { useCreateApplication } from "../hooks/useApplications";
import { MS_PER_DAY } from "../lib/constants";
import { formatDateShort } from "../lib/dateUtils";
import { cn } from "../lib/utils";

const PILL_CLASS =
  "inline-flex w-16 shrink-0 justify-center rounded-full bg-surface-1 px-2 py-0.5 text-[0.6875rem] capitalize text-text-2";

const ROW_FOCUS =
  "focus:outline-none focus-visible:border-l-2 focus-visible:border-l-brand-600 dark:focus-visible:border-l-brand-500";

function formatPostedCompact(isoString) {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((todayStart - targetStart) / MS_PER_DAY);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1d ago";
  if (diffDays <= 30) return `${diffDays}d ago`;
  return formatDateShort(isoString);
}

function remoteLabel(status) {
  if (!status || status === "unknown") return null;
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function levelLabel(level) {
  if (!level) return null;
  return level.replace(/_/g, " ");
}

function rowClassName({ isSelected, isFocused }) {
  return cn(
    "group flex h-10 cursor-pointer items-center gap-2 border-b border-border-1 px-4",
    "hover:bg-surface-1 motion-reduce:transition-none transition-colors duration-[120ms] ease-out",
    ROW_FOCUS,
    (isSelected || isFocused) && "border-l-2 border-l-brand-600 bg-brand-50/40 dark:border-l-brand-500 dark:bg-brand-900/20"
  );
}

function JobRow({ job, style, onSelect, isSelected = false, isFocused = false, isBookmarked = false }) {
  const createMutation = useCreateApplication();
  const company = job.company ?? "Unknown Company";
  const role = job.role ?? "Untitled Role";
  const remote = remoteLabel(job.remote_status);
  const level = levelLabel(job.experience_level);
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
    <div
      style={style}
      role="row"
      data-testid="job-row"
      aria-label={`${company}, ${role}`}
      className={rowClassName({ isSelected, isFocused })}
      onClick={() => onSelect?.(job)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(job);
        }
      }}
      tabIndex={0}
    >
      <span className="flex w-4 shrink-0 items-center justify-center" aria-hidden="true">
        <Bookmark
          className={cn(
            "h-4 w-4",
            isBookmarked ? "fill-brand-600 text-brand-600" : "text-text-3"
          )}
        />
      </span>

      <CompanyLogo
        company_domain={job.company_domain ?? null}
        company={company}
        size={16}
      />

      <span className="w-[8.75rem] shrink-0 truncate text-[0.8125rem] font-medium text-text-1">
        {company}
      </span>

      <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-normal text-text-2">
        {role}
      </span>

      <span className="hidden w-20 shrink-0 truncate text-xs text-text-3 sm:block">
        {job.location ?? "N/A"}
      </span>

      {remote ? (
        <span className={cn(PILL_CLASS, "hidden lg:inline-flex")}>{remote}</span>
      ) : (
        <span className="hidden w-16 shrink-0 lg:block" aria-hidden="true" />
      )}

      {level ? (
        <span className={cn(PILL_CLASS, "hidden xl:inline-flex")}>{level}</span>
      ) : (
        <span className="hidden w-16 shrink-0 xl:block" aria-hidden="true" />
      )}

      <span className="hidden w-16 shrink-0 text-[0.6875rem] text-text-3 md:block">{posted}</span>

      {job.is_stale && (
        <span
          className="hidden shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.625rem] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 lg:inline-flex"
          data-testid="stale-badge"
        >
          Stale
        </span>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={createMutation.isPending}
        aria-label={`Track ${role} at ${company}`}
        onClick={handleTrack}
        className={cn(
          "h-7 shrink-0 gap-0.5 px-2 text-xs font-medium text-brand-700 opacity-100 md:opacity-0",
          "hover:bg-brand-50 hover:text-brand-800 group-hover:opacity-100",
          "focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2",
          "dark:text-brand-300 dark:hover:bg-brand-900/30 dark:focus-visible:outline-1"
        )}
      >
        <Plus className="h-3 w-3" aria-hidden="true" />
        Track
      </Button>
    </div>
  );
}

export default JobRow;
