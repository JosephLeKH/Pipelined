/** Slide-in detail panel for a job listing on the job board. */

import { useState } from "react";
import { toast } from "sonner";

import X from "lucide-react/dist/esm/icons/x";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign";
import Briefcase from "lucide-react/dist/esm/icons/briefcase";

import CompanyLogo from "./CompanyLogo";
import { Button } from "./ui/button";
import { formatDate } from "../lib/dateUtils";
import { useCreateApplication } from "../hooks/useApplications";

const STALE_LABEL = "May be expired";

function MetaRow({ job }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
      {job.location && (
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          {job.location}
        </span>
      )}
      {job.remote_status && (
        <span className="text-sm capitalize text-muted-foreground">{job.remote_status}</span>
      )}
      {job.experience_level && (
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          {job.experience_level}
        </span>
      )}
      {job.salary_range && (
        <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
          <DollarSign className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {job.salary_range}
        </span>
      )}
    </div>
  );
}

function RequirementsList({ requirements }) {
  const items = Array.isArray(requirements) ? requirements : [requirements];
  return (
    <div>
      <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Requirements
      </h3>
      <ul className="flex flex-col gap-1.5 text-sm text-foreground">
        {items.map((req, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {req}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PanelFooter({ job, saved, onSave, isPending }) {
  return (
    <div className="flex gap-3 border-t border-border px-6 py-4">
      {job.apply_url && (
        <Button asChild>
          <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            Apply on Company Site
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </Button>
      )}
      <Button type="button" variant="outline" onClick={onSave} disabled={saved || isPending}>
        {saved ? "Saved!" : "Save to Pipeline"}
      </Button>
    </div>
  );
}

function JobDetailPanel({ job, onClose }) {
  const [saved, setSaved] = useState(false);
  const createMutation = useCreateApplication();
  const datePosted = job.date_posted ? formatDate(job.date_posted) : null;

  function handleSave() {
    createMutation.mutate(
      {
        role_title: job.role ?? "",
        company: job.company ?? "",
        location: job.location ?? "",
        stage: "Applied",
      },
      {
        onSuccess: () => { setSaved(true); toast.success("Saved to pipeline!"); },
        onError: () => toast.error("Failed to save. Are you signed in?"),
      }
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      role="dialog"
      aria-label={`${job.role ?? "Job"} detail`}
    >
      <Button
        type="button"
        variant="ghost"
        className="absolute inset-0 h-full w-full rounded-none bg-black/30 backdrop-blur-sm hover:bg-black/30"
        onClick={onClose}
        aria-label="Close detail panel"
        tabIndex={-1}
      />
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-card shadow-lg">
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-4">
            <CompanyLogo
              company_domain={job.company_domain ?? null}
              company={job.company ?? ""}
              size={48}
            />
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                {job.role ?? "Untitled Role"}
              </h2>
              <p className="text-sm text-muted-foreground">{job.company ?? ""}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <MetaRow job={job} />

        <div className="flex flex-1 flex-col gap-5 px-6 py-5">
          {job.is_stale && (
            <span className="self-start rounded-full text-xs font-medium px-2.5 py-1 inline-flex items-center gap-1 bg-amber-100 text-amber-800">
              {STALE_LABEL}
            </span>
          )}
          {datePosted && <p className="text-xs text-muted-foreground">Posted {datePosted}</p>}

          {job.description && (
            <div>
              <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {job.description}
              </p>
            </div>
          )}

          {job.requirements && <RequirementsList requirements={job.requirements} />}
        </div>

        <PanelFooter
          job={job}
          saved={saved}
          onSave={handleSave}
          isPending={createMutation.isPending}
        />
      </div>
    </div>
  );
}

export default JobDetailPanel;
