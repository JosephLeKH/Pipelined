/** PanelBody and its helpers: field display, follow-up date, tags, and full detail layout. */

import { useState, useCallback } from "react";

import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";

import { INPUT_BASE } from "../lib/designTokens";
import { STAGE_COLORS, DEFAULT_STAGE_COLOR, MS_PER_DAY, PREP_CHECKLIST_STARTER_SUGGESTIONS } from "../lib/constants";
import { useAuth } from "../context/AuthContext";
import { useUpdateApplication } from "../hooks/useApplications";
import ContactsSection from "./ContactsSection";
import { DetailPanelNotes } from "./DetailPanelNotes";
import { DetailPanelTimeline } from "./DetailPanelTimeline";
import OfferDetailsSection from "./OfferDetailsSection";
import { ChecklistItem, AddChecklistItem } from "./PrepChecklist";
import ResumeFitSection from "./ResumeFitSection";
import TagInput from "./TagInput";
import { formatDate } from "../lib/dateUtils";

function DetailField({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">{label}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200">{value}</span>
    </div>
  );
}

function FollowUpSection({ application, onUpdate }) {
  const rawDate = application.follow_up_date;
  const dateValue = rawDate ? rawDate.slice(0, 10) : "";
  const isOverdue = rawDate && new Date(rawDate) < new Date(new Date().toDateString());
  const overdueDays = isOverdue
    ? Math.floor((Date.now() - new Date(rawDate).getTime()) / MS_PER_DAY)
    : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500" htmlFor="follow-up-date">
        Follow up
      </label>
      {isOverdue && (
        <div className="flex items-center gap-1.5 rounded bg-amber-50 px-2 py-1.5 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
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
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors dark:hover:text-gray-300"
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
      <span className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">Tags</span>
      <TagInput value={application.tags ?? []} onChange={handleTagsChange} />
    </div>
  );
}

function PrepChecklistView({ checklist, onToggle, onDelete, onAdd }) {
  const checkedCount = checklist.filter((i) => i.checked).length;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">Prep Checklist</span>
        {checklist.length > 0 && (
          <span className={`text-xs font-medium tabular-nums ${checkedCount === checklist.length ? "text-green-600 dark:text-green-400" : "text-gray-500"}`}>
            {checkedCount} / {checklist.length}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        {checklist.map((item) => (
          <ChecklistItem key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />
        ))}
        {checklist.length === 0 && (
          <div className="flex flex-col gap-1 py-1">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Suggestions:</p>
            {PREP_CHECKLIST_STARTER_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onAdd(s)}
                className="text-left text-xs text-brand-600 hover:text-brand-800 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 rounded dark:text-brand-400 dark:hover:text-brand-300"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <AddChecklistItem onAdd={onAdd} />
    </div>
  );
}

function ApplicationPrepSection({ applicationId, initialChecklist }) {
  const [checklist, setChecklist] = useState(initialChecklist ?? []);
  const { mutate: updateApp } = useUpdateApplication();

  const handleToggle = useCallback((itemId) => {
    setChecklist((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );
      updateApp({ id: applicationId, body: { prep_checklist: updated } });
      return updated;
    });
  }, [applicationId, updateApp]);

  const handleAdd = useCallback((text) => {
    setChecklist((prev) => {
      const updated = [...prev, { id: crypto.randomUUID(), text, checked: false }];
      updateApp({ id: applicationId, body: { prep_checklist: updated } });
      return updated;
    });
  }, [applicationId, updateApp]);

  const handleDelete = useCallback((itemId) => {
    setChecklist((prev) => {
      const updated = prev.filter((item) => item.id !== itemId);
      updateApp({ id: applicationId, body: { prep_checklist: updated } });
      return updated;
    });
  }, [applicationId, updateApp]);

  return <PrepChecklistView checklist={checklist} onToggle={handleToggle} onAdd={handleAdd} onDelete={handleDelete} />;
}

function JobPostingLink({ url }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-brand-600 hover:underline" aria-label="Job posting">
      <ExternalLink className="h-3.5 w-3.5" />
      Job posting
    </a>
  );
}

function StageSelector({ stageOptions, currentStage, onStageChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">Stage</span>
      <div role="group" aria-label="Stage" className="flex flex-wrap gap-1.5">
        {[...stageOptions, ...(stageOptions.includes(currentStage) ? [] : [currentStage])].map((s) => {
          const active = s === currentStage;
          const color = STAGE_COLORS[s] ?? DEFAULT_STAGE_COLOR;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onStageChange({ target: { value: s } })}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? `${color.activeBg} border-transparent text-white`
                  : `border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700`
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
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
      <JobPostingLink url={application.source_url} />
      <StageSelector stageOptions={stageOptions} currentStage={application.current_stage} onStageChange={handleStageChange} />
      <TagsSection application={application} onUpdate={handleUpdate} />
      <FollowUpSection application={application} onUpdate={handleUpdate} />
      {application.current_stage === "Offer" && (
        <OfferDetailsSection application={application} onUpdate={handleUpdate} />
      )}
      <DetailPanelNotes applicationId={application.id} initialValue={application.notes} onDirtyChange={onDirtyChange} />
      <ApplicationPrepSection applicationId={application.id} initialChecklist={application.prep_checklist} />
      <DetailPanelTimeline stageHistory={application.stage_history} applicationId={application.id} onAddEvent={onAddEvent} />
      <ContactsSection applicationId={application.id} />
      {(application.ai_analysis || user?.ai_scores_remaining_today === 0) && user?.has_resume && (
        <ResumeFitSection analysis={application.ai_analysis} aiScoresRemainingToday={user?.ai_scores_remaining_today} />
      )}
    </div>
  );
}
