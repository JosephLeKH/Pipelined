/** Slide-in 520px detail drawer for a job listing on the job board (PRD-06 §6). */

import { useState, useCallback } from "react";
import { toast } from "sonner";

import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import X from "lucide-react/dist/esm/icons/x";

import FitBadge from "./FitBadge";
import { DetailSectionTitle } from "./DetailPanelSections";
import { Button } from "./ui/button";
import { useCreateApplication } from "../hooks/useApplications";
import { DETAIL_PANEL_WIDTH_PX, DRAWER_ANIMATION_MS, MS_PER_DAY } from "../lib/constants";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "../lib/designTokens";
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

function PanelHeader({ title, applyUrl, tracked, isPending, onClose, onTrack }) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border-1 px-4">
      <h2 id="job-detail-heading" className="min-w-0 flex-1 truncate text-sm font-semibold text-text-1">
        {title}
      </h2>
      <Button
        type="button"
        size="sm"
        disabled={tracked || isPending}
        onClick={onTrack}
        className={`${BUTTON_PRIMARY} h-8 shrink-0 gap-1 px-3 dark:focus-visible:outline-1`}
      >
        {tracked ? "Tracking" : "Track"}
        {!tracked && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
      </Button>
      {applyUrl && (
        <Button asChild size="sm" variant="outline" className={`${BUTTON_SECONDARY} h-8 shrink-0 gap-1 px-3`}>
          <a href={applyUrl} target="_blank" rel="noopener noreferrer">
            Open job
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="Close"
        className="h-7 w-7 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function MetaLine({ posted, fitScore }) {
  const showFit = typeof fitScore === "number" && fitScore > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border-1 px-4 py-3 text-xs text-text-3">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600 dark:bg-brand-500" aria-hidden="true" />
      {posted && <span>Posted {posted}</span>}
      {posted && showFit && <span aria-hidden="true">·</span>}
      {showFit && <FitBadge score={fitScore} />}
    </div>
  );
}

function RequirementsList({ requirements }) {
  const items = Array.isArray(requirements) ? requirements : [requirements];

  return (
    <section>
      <DetailSectionTitle>Requirements</DetailSectionTitle>
      <ul className="flex flex-col gap-1.5 text-sm text-text-1">
        {items.map((req, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-text-3" aria-hidden="true" />
            {req}
          </li>
        ))}
      </ul>
    </section>
  );
}

function JobDetailPanel({ job, onClose }) {
  const [tracked, setTracked] = useState(false);
  const createMutation = useCreateApplication();
  const company = job.company ?? "";
  const role = job.role ?? "Untitled Role";
  const title = company ? `${company} · ${role}` : role;
  const posted = formatPostedCompact(job.date_posted);
  const fitScore = job.score ?? job.fit_score ?? null;

  const handleTrack = useCallback(() => {
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
        onSuccess: () => {
          setTracked(true);
          toast.success(`Tracking ${company} · ${role}`);
        },
        onError: () => toast.error("Failed to track job. Are you signed in?"),
      }
    );
  }, [company, createMutation, job.apply_url, job.location, role]);

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-11 z-40 flex justify-end transition-opacity motion-reduce:transition-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-detail-heading"
      style={{ transitionDuration: `${DRAWER_ANIMATION_MS}ms` }}
    >
      <Button
        type="button"
        variant="ghost"
        className="absolute inset-0 h-full w-full rounded-none bg-black/30 backdrop-blur-sm hover:bg-black/30 motion-reduce:backdrop-blur-none"
        onClick={onClose}
        aria-label="Close detail panel"
        tabIndex={-1}
      />
      <div
        data-testid="job-detail-panel"
        className="relative flex h-full flex-col overflow-y-auto border-l border-border-1 bg-surface-0 shadow-modal motion-safe-drawer animate-slide-in-right dark:bg-surface-0"
        style={{ width: DETAIL_PANEL_WIDTH_PX, maxWidth: "100%", transitionDuration: `${DRAWER_ANIMATION_MS}ms` }}
      >
        <PanelHeader
          title={title}
          applyUrl={job.apply_url}
          tracked={tracked}
          isPending={createMutation.isPending}
          onClose={onClose}
          onTrack={handleTrack}
        />

        <MetaLine posted={posted} fitScore={fitScore} />

        <div className="flex flex-1 flex-col gap-4 px-4 py-4">
          {job.is_stale && (
            <span className="self-start rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              {STALE_LABEL}
            </span>
          )}

          {job.description && (
            <section>
              <DetailSectionTitle>About the role</DetailSectionTitle>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-2">{job.description}</p>
            </section>
          )}

          {job.requirements && <RequirementsList requirements={job.requirements} />}
        </div>
      </div>
    </div>
  );
}

export default JobDetailPanel;
