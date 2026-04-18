/** PanelBody and its helpers: field display, follow-up date, tags, and full detail layout. */

import { useState } from "react";

import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";

import { INPUT_BASE } from "../lib/designTokens";
import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { useAuth } from "../context/AuthContext";
import ContactsSection from "./ContactsSection";
import { DetailPanelNotes } from "./DetailPanelNotes";
import { DetailPanelTimeline } from "./DetailPanelTimeline";
import OfferDetailsSection from "./OfferDetailsSection";
import ResumeFitSection from "./ResumeFitSection";
import TagInput from "./TagInput";
import { formatDate } from "../lib/dateUtils";

function DetailField({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500">{label}</span>
      <span className="text-sm text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}

function FollowUpSection({ application, onUpdate }) {
  const rawDate = application.follow_up_date;
  const dateValue = rawDate ? rawDate.slice(0, 10) : "";
  const isOverdue = rawDate && new Date(rawDate) < new Date(new Date().toDateString());
  const overdueDays = isOverdue
    ? Math.floor((Date.now() - new Date(rawDate).getTime()) / 86_400_000)
    : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500" htmlFor="follow-up-date">
        Follow up
      </label>
      {isOverdue && (
        <div className="flex items-center gap-1.5 rounded bg-yellow-50 px-2 py-1.5 text-xs text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Follow-up overdue by {overdueDays} day{overdueDays !== 1 ? "s" : ""}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          id="follow-up-date"
          type="date"
          value={dateValue}
          onChange={(e) => onUpdate({ follow_up_date: e.target.value || null })}
          className={`flex-1 ${INPUT_BASE}`}
        />
        {dateValue && (
          <button
            type="button"
            onClick={() => onUpdate({ follow_up_date: null })}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function TagsSection({ application, onUpdate }) {
  function handleTagsChange(tags) {
    onUpdate({ tags });
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500">Tags</span>
      <TagInput value={application.tags ?? []} onChange={handleTagsChange} />
    </div>
  );
}

export function PanelBody({ application, handleStageChange, handleUpdate, onAddEvent, onDirtyChange }) {
  const { user } = useAuth();
  const stageOptions = user?.default_stages ?? [];
  const dateApplied = formatDate(application.date_applied);
  return (
    <div className="flex flex-col gap-4 px-6 py-4">
      <div className="grid grid-cols-2 gap-3">
        <DetailField label="Date Applied" value={dateApplied} />
        <DetailField label="Location" value={application.location} />
        <DetailField label="Remote" value={application.remote_status} />
        <DetailField label="Compensation" value={application.compensation} />
        <DetailField label="Company Type" value={application.company_type} />
      </div>
      {application.source_url && (
        <a
          href={application.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
          aria-label="Job posting"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Job posting
        </a>
      )}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500">
          Stage
        </span>
        <div
          role="group"
          aria-label="Stage"
          className="flex flex-wrap gap-1.5"
        >
          {[...stageOptions, ...(stageOptions.includes(application.current_stage) ? [] : [application.current_stage])].map((s) => {
            const active = s === application.current_stage;
            const color = STAGE_COLORS[s] ?? DEFAULT_STAGE_COLOR;
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleStageChange({ target: { value: s } })}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? `${color.activeBg} border-transparent text-white`
                    : `border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700`
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
      <TagsSection application={application} onUpdate={handleUpdate} />
      <FollowUpSection application={application} onUpdate={handleUpdate} />
      {application.current_stage === "Offer" && (
        <OfferDetailsSection application={application} onUpdate={handleUpdate} />
      )}
      <DetailPanelNotes applicationId={application.id} initialValue={application.notes} onDirtyChange={onDirtyChange} />
      <DetailPanelTimeline stageHistory={application.stage_history} applicationId={application.id} onAddEvent={onAddEvent} />
      <ContactsSection applicationId={application.id} />
      {(application.ai_analysis || user?.ai_scores_remaining_today === 0) && user?.has_resume && (
        <ResumeFitSection
          analysis={application.ai_analysis}
          aiScoresRemainingToday={user?.ai_scores_remaining_today}
        />
      )}
    </div>
  );
}
