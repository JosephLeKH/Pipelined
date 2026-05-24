/** Extracted detail panel sections: fields, tags, follow-up date, prep checklist. */

import { useState, useCallback } from "react";

import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";

import { STAGE_COLORS, DEFAULT_STAGE_COLOR, MS_PER_DAY, PREP_CHECKLIST_STARTER_SUGGESTIONS } from "../lib/constants";
import { useUpdateApplication } from "../hooks/useApplications";
import { ChecklistItem, AddChecklistItem } from "./PrepChecklist";
import TagInput from "./TagInput";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export const PREP_CHECKLIST_LABEL = "Interview task checklist";

export function DetailField({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

export function FollowUpSection({ application, onUpdate }) {
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onUpdate({ follow_up_date: null })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

export function TagsSection({ application, onUpdate }) {
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
        <span className="text-xs font-medium uppercase text-muted-foreground">{PREP_CHECKLIST_LABEL}</span>
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

export function ApplicationPrepSection({ applicationId, initialChecklist }) {
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

export function JobPostingLink({ url }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline" aria-label="Job posting">
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      Job posting
    </a>
  );
}

export function StageSelector({ stageOptions, currentStage, onStageChange }) {
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
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
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
