/** Compact centered dialog for a job listing on the job board. */

import { useState, useCallback } from "react";
import { toast } from "sonner";

import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Briefcase from "lucide-react/dist/esm/icons/briefcase";
import Wifi from "lucide-react/dist/esm/icons/wifi";
import X from "lucide-react/dist/esm/icons/x";

import CompanyLogo from "./CompanyLogo";
import FitBadge from "./FitBadge";
import { Button } from "./ui/button";
import { useCreateApplication } from "../hooks/useApplications";
import { MS_PER_DAY } from "../lib/constants";
import { formatDateShort } from "../lib/dateUtils";

const STALE_LABEL = "May be expired";

function formatPostedCompact(isoString) {
  if (!isoString) return null;
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

function titleCase(value) {
  if (!value) return null;
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function MetaPill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border-1 bg-surface-1 px-2 py-1 text-xs text-text-2">
      <Icon className="h-3 w-3 text-text-3" aria-hidden="true" />
      {children}
    </span>
  );
}

function JobDetailPanel({ job, onClose }) {
  const [tracked, setTracked] = useState(false);
  const createMutation = useCreateApplication();
  const company = job.company ?? "";
  const role = job.role ?? "Untitled Role";
  const posted = formatPostedCompact(job.date_posted);
  const fitScore = job.score ?? job.fit_score ?? null;
  const showFit = typeof fitScore === "number" && fitScore > 0;
  const remoteLabel = job.remote_status && job.remote_status !== "unknown"
    ? titleCase(job.remote_status)
    : null;
  const levelLabel = titleCase(job.experience_level);

  const markApplied = useCallback(
    (onComplete) => {
      if (tracked) {
        onComplete?.();
        return;
      }
      createMutation.mutate(
        {
          role_title: role,
          company,
          location: job.location ?? "",
          current_stage: "Applied",
          source: "board",
          source_url: job.apply_url || undefined,
        },
        {
          onSuccess: () => {
            setTracked(true);
            toast.success(`Marked applied: ${company} · ${role}`);
            onComplete?.();
          },
          onError: () => toast.error("Could not mark applied. Are you signed in?"),
        }
      );
    },
    [company, createMutation, job.apply_url, job.location, role, tracked]
  );

  const handleMarkApplied = useCallback(() => markApplied(), [markApplied]);

  const handleOpenSite = useCallback(() => {
    if (job.apply_url) {
      window.open(job.apply_url, "_blank", "noopener,noreferrer");
    }
    markApplied();
  }, [job.apply_url, markApplied]);

  const handleBackdropClick = useCallback(
    (event) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-detail-heading"
      onClick={handleBackdropClick}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] motion-safe:animate-in motion-safe:fade-in-0"
    >
      <div
        data-testid="job-detail-panel"
        className="relative flex w-full max-w-md flex-col gap-4 rounded-xl border border-border-1 bg-surface-0 p-5 shadow-modal motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-2 dark:bg-surface-0"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-text-3 hover:bg-surface-1 hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <CompanyLogo company={company} company_domain={job.company_domain} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-3">{company || "Unknown"}</p>
            <h2 id="job-detail-heading" className="mt-0.5 break-words text-base font-semibold text-text-1">
              {role}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {job.location && <MetaPill icon={MapPin}>{job.location}</MetaPill>}
          {remoteLabel && <MetaPill icon={Wifi}>{remoteLabel}</MetaPill>}
          {levelLabel && <MetaPill icon={Briefcase}>{levelLabel}</MetaPill>}
          {job.salary_range && <MetaPill icon={Briefcase}>{job.salary_range}</MetaPill>}
        </div>

        {(posted || showFit || job.is_stale) && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-3">
            {posted && <span>Posted {posted}</span>}
            {posted && (showFit || job.is_stale) && <span aria-hidden="true">·</span>}
            {showFit && <FitBadge score={fitScore} />}
            {job.is_stale && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.6875rem] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {STALE_LABEL}
              </span>
            )}
          </div>
        )}

        {job.description && (
          <p className="line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-text-2">
            {job.description}
          </p>
        )}

        <p className="text-xs italic text-text-3">
          Full details are on the company site. Mark as applied once you have submitted.
        </p>

        <div className="flex flex-wrap gap-2">
          {job.apply_url && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenSite}
              disabled={createMutation.isPending}
              className="flex-1 gap-1.5"
            >
              Open site
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleMarkApplied}
            disabled={tracked || createMutation.isPending}
            className="flex-1 gap-1.5"
          >
            {tracked ? (
              <>
                <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Applied
              </>
            ) : (
              "Mark applied"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default JobDetailPanel;
