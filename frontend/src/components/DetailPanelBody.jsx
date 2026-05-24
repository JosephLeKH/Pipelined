/** PanelBody and its helpers: field display, follow-up date, tags, and full detail layout. */

import { useState, useCallback } from "react";

import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import Mail from "lucide-react/dist/esm/icons/mail";
import { toast } from "sonner";
import { differenceInDays } from "date-fns/differenceInDays";

import { STAGE_COLORS, DEFAULT_STAGE_COLOR, MS_PER_DAY, PREP_CHECKLIST_STARTER_SUGGESTIONS } from "../lib/constants";
import { useAuth } from "../context/AuthContext";
import { useUpdateApplication } from "../hooks/useApplications";
import { generateFollowUpDraft } from "../api/applications";
import ContactsSection from "./ContactsSection";
import { DetailPanelNotes } from "./DetailPanelNotes";
import { DetailPanelTimeline } from "./DetailPanelTimeline";
import OfferDetailsSection from "./OfferDetailsSection";
import { ChecklistItem, AddChecklistItem } from "./PrepChecklist";
import { InterviewPrepAgent } from "./InterviewPrepAgent";
import ResumeFitSection from "./ResumeFitSection";
import TagInput from "./TagInput";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { formatDate } from "../lib/dateUtils";

function DetailField({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
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
      <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="follow-up-date">
        Follow up
      </label>
      {isOverdue && (
        <div className="flex items-center gap-1.5 rounded border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Follow-up overdue by {overdueDays} day{overdueDays !== 1 ? "s" : ""}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          id="follow-up-date"
          type="date"
          value={dateValue}
          onChange={(e) => onUpdate({ follow_up_date: e.target.value || null })}
          className="flex-1"
        />
        {dateValue && (
          <Button type="button" variant="ghost" size="sm"
            onClick={() => onUpdate({ follow_up_date: null })}
            className="text-xs text-muted-foreground hover:text-foreground">
            Clear
          </Button>
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
      <span className="text-xs font-medium uppercase text-muted-foreground">Tags</span>
      <TagInput value={application.tags ?? []} onChange={handleTagsChange} />
    </div>
  );
}

function PrepChecklistView({ checklist, onToggle, onDelete, onAdd }) {
  const checkedCount = checklist.filter((i) => i.checked).length;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-muted-foreground">Prep Checklist</span>
        {checklist.length > 0 && (
          <span className={`text-xs font-medium tabular-nums ${checkedCount === checklist.length ? "text-primary" : "text-muted-foreground"}`}>
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
            <p className="text-xs text-muted-foreground mb-1">Suggestions:</p>
            {PREP_CHECKLIST_STARTER_SUGGESTIONS.map((s) => (
              <Button key={s} type="button" variant="link" onClick={() => onAdd(s)}
                className="h-auto p-0 text-xs justify-start">
                + {s}
              </Button>
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
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline" aria-label="Job posting">
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      Job posting
    </a>
  );
}

function FollowUpDraftSection({ application }) {
  const [draft, setDraft] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const daysSinceUpdate = application.updated_at
    ? differenceInDays(new Date(), new Date(application.updated_at))
    : 0;
  const isStale = daysSinceUpdate >= 14;
  const shouldShow = isStale && ['Applied', 'Phone Screen'].includes(application.current_stage);

  if (!shouldShow) return null;

  async function handleGenerateDraft() {
    setIsLoading(true);
    try {
      const result = await generateFollowUpDraft(application.id);
      setDraft(result);
      setIsExpanded(true);
    } catch (error) {
      toast.error('Could not generate draft — try again');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopyDraft() {
    if (!draft) return;
    const fullEmail = `Subject: ${draft.subject}\n\n${draft.body}`;
    try {
      await navigator.clipboard.writeText(fullEmail);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerateDraft}
        disabled={isLoading}
        className="w-full sm:w-auto"
      >
        <Mail className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
        {isLoading ? 'Generating...' : 'Draft follow-up'}
      </Button>
      {draft && (
        <div className="rounded border border-border bg-card p-3 space-y-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            <span>Draft Email</span>
            <span className="text-xs text-muted-foreground">{isExpanded ? '▼' : '▶'}</span>
          </button>
          {isExpanded && (
            <div className="flex flex-col gap-2 pt-1 border-t border-border">
              <p className="font-medium text-sm">{draft.subject}</p>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">{draft.body}</pre>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyDraft}
                  className="text-xs"
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StageSelector({ stageOptions, currentStage, onStageChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase text-muted-foreground">Stage</span>
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
                  : `border-border bg-card text-muted-foreground hover:bg-muted`
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
      <InterviewPrepAgent applicationId={application.id} briefing={application.interview_prep_briefing} generatedAt={application.interview_prep_generated_at} />
      <DetailPanelTimeline stageHistory={application.stage_history} applicationId={application.id} onAddEvent={onAddEvent} />
      <ContactsSection applicationId={application.id} />
      {(application.ai_analysis || user?.ai_scores_remaining_today === 0) && user?.has_resume && (
        <ResumeFitSection analysis={application.ai_analysis} aiScoresRemainingToday={user?.ai_scores_remaining_today} />
      )}
    </div>
  );
}
