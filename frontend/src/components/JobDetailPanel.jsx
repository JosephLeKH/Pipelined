/** Slide-in detail panel for a job listing on the job board. */

import { useState } from "react";
import { toast } from "sonner";

import X from "lucide-react/dist/esm/icons/x";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign";
import Briefcase from "lucide-react/dist/esm/icons/briefcase";

import CompanyLogo from "./CompanyLogo";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, BADGE_BASE } from "../lib/designTokens";
import { formatDate } from "../lib/dateUtils";
import { useCreateApplication } from "../hooks/useApplications";

const STALE_LABEL = "May be expired";

function MetaRow({ job }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
      {job.location && (
        <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
          {job.location}
        </span>
      )}
      {job.remote_status && (
        <span className="text-sm capitalize text-gray-600 dark:text-gray-400">{job.remote_status}</span>
      )}
      {job.experience_level && (
        <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Briefcase className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
          {job.experience_level}
        </span>
      )}
      {job.salary_range && (
        <span className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
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
      <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-gray-400">
        Requirements
      </h3>
      <ul className="flex flex-col gap-1.5 text-sm text-gray-700 dark:text-gray-300">
        {items.map((req, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
            {req}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PanelFooter({ job, saved, onSave, isPending }) {
  return (
    <div className="flex gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
      {job.apply_url && (
        <a
          href={job.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 ${BUTTON_PRIMARY}`}
        >
          Apply on Company Site
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={saved || isPending}
        className={BUTTON_SECONDARY}
      >
        {saved ? "Saved!" : "Save to Pipeline"}
      </button>
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
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close detail panel"
        tabIndex={-1}
      />
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-modal dark:bg-gray-800">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <CompanyLogo
              company_domain={job.company_domain ?? null}
              company={job.company ?? ""}
              size={48}
            />
            <div>
              <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-gray-100">
                {job.role ?? "Untitled Role"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{job.company ?? ""}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <MetaRow job={job} />

        <div className="flex flex-1 flex-col gap-5 px-6 py-5">
          {job.is_stale && (
            <span className={`self-start ${BADGE_BASE} bg-amber-100 text-amber-800`}>
              {STALE_LABEL}
            </span>
          )}
          {datePosted && <p className="text-xs text-gray-400">Posted {datePosted}</p>}

          {job.description && (
            <div>
              <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-gray-400">
                Description
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
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
