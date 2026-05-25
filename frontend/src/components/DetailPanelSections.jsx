/** Extracted detail panel sections: fields, tags, follow-up date, prep checklist, stage picker. */

import { useState, useCallback } from "react";

import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";

import { STAGE_COLORS, DEFAULT_STAGE_COLOR, MS_PER_DAY, PREP_CHECKLIST_STARTER_SUGGESTIONS } from "../lib/constants";
import { formatDateShort, formatRelative } from "../lib/dateUtils";
import { useUpdateApplication } from "../hooks/useApplications";
import { ChecklistItem, AddChecklistItem } from "./PrepChecklist";
import TagInput from "./TagInput";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export const PREP_CHECKLIST_LABEL = "Interview task checklist";

const SOURCE_LABELS = {
  manual: "Manual",
  extension: "Chrome extension",
  email: "Email",
  board: "Job board",
};

const SECTION_TITLE_CLASS =
  "border-t border-border-1 pt-4 pb-2 text-sm font-semibold tracking-[-0.01em] text-text-1";

const FIELD_LABEL_CLASS = "text-xs font-medium uppercase tracking-wide text-text-3";

export function DetailSectionTitle({ children }) {
  return <h3 className={SECTION_TITLE_CLASS}>{children}</h3>;
}

export function DetailField({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <span className="text-sm text-text-1">{value}</span>
    </div>
  );
}

function formatApplicationSource(source) {
  if (!source) return null;
  return SOURCE_LABELS[source] ?? source.replace(/_/g, " ");
}

export function DetailPanelMetaRow({ application }) {
  const applied = formatDateShort(application.date_applied);
  const updated = application.updated_at ? formatRelative(application.updated_at) : null;
  const sourceLabel = formatApplicationSource(application.source);

  return (
    <div className="flex flex-col gap-1 border-b border-border-1 py-3 text-xs text-text-2">
      {(applied || updated) && (
        <p>
          {applied && (
            <>
              <span className="text-text-3">Applied</span> {applied}
            </>
          )}
          {updated && (
            <>
              {applied ? " · " : ""}
              <span className="text-text-3">Updated</span> {updated}
            </>
          )}
        </p>
      )}
      {sourceLabel && (
        <p>
          <span className="text-text-3">Source:</span> {sourceLabel}
        </p>
      )}
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
      <label className={FIELD_LABEL_CLASS} htmlFor="follow-up-date">
        Follow up
      </label>
      {isOverdue && (
        <div className="flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-2 py-1.5 text-xs text-brand-900">
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
            className="text-xs text-text-3 hover:bg-surface-2 hover:text-text-1"
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
      <span className={FIELD_LABEL_CLASS}>Tags</span>
      <TagInput value={application.tags ?? []} onChange={handleTagsChange} />
    </div>
  );
}

function PrepChecklistView({ checklist, onToggle, onDelete, onAdd }) {
  const checkedCount = checklist.filter((i) => i.checked).length;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className={FIELD_LABEL_CLASS}>{PREP_CHECKLIST_LABEL}</span>
        {checklist.length > 0 && (
          <span
            className={`text-xs font-medium tabular-nums ${
              checkedCount === checklist.length ? "text-brand-600" : "text-text-3"
            }`}
          >
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
            <p className="mb-1 text-xs text-text-3">Suggestions:</p>
            {PREP_CHECKLIST_STARTER_SUGGESTIONS.map((s) => (
              <Button
                key={s}
                type="button"
                variant="link"
                onClick={() => onAdd(s)}
                className="h-auto justify-start p-0 text-xs text-text-2 hover:text-text-1"
              >
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

  const handleToggle = useCallback(
    (itemId) => {
      setChecklist((prev) => {
        const updated = prev.map((item) =>
          item.id === itemId ? { ...item, checked: !item.checked } : item
        );
        updateApp({ id: applicationId, body: { prep_checklist: updated } });
        return updated;
      });
    },
    [applicationId, updateApp]
  );

  const handleAdd = useCallback(
    (text) => {
      setChecklist((prev) => {
        const updated = [...prev, { id: crypto.randomUUID(), text, checked: false }];
        updateApp({ id: applicationId, body: { prep_checklist: updated } });
        return updated;
      });
    },
    [applicationId, updateApp]
  );

  const handleDelete = useCallback(
    (itemId) => {
      setChecklist((prev) => {
        const updated = prev.filter((item) => item.id !== itemId);
        updateApp({ id: applicationId, body: { prep_checklist: updated } });
        return updated;
      });
    },
    [applicationId, updateApp]
  );

  return (
    <PrepChecklistView checklist={checklist} onToggle={handleToggle} onAdd={handleAdd} onDelete={handleDelete} />
  );
}

export function JobPostingLink({ url }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 hover:underline motion-reduce:transition-none transition-colors duration-hover ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
      aria-label="Job posting"
    >
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      Job posting
    </a>
  );
}

const STAGE_TRIGGER_CLASS =
  "inline-flex h-7 items-center gap-1.5 rounded-md bg-surface-1 px-2 text-xs text-text-1 hover:bg-surface-2 motion-reduce:transition-none transition-colors duration-hover ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

export function StageSelector({ stageOptions, currentStage, onStageChange }) {
  const colors = STAGE_COLORS[currentStage] ?? DEFAULT_STAGE_COLOR;
  const options = [...stageOptions, ...(stageOptions.includes(currentStage) ? [] : [currentStage])];

  function selectStage(stage) {
    onStageChange({ target: { value: stage } });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button id="stage-select" type="button" aria-label="Stage" className={STAGE_TRIGGER_CLASS}>
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: colors.dotColor }}
            aria-hidden="true"
          />
          {currentStage}
          <ChevronDown className="h-3 w-3 text-text-3" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[10rem]">
        {options.map((stage) => {
          const stageColors = STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR;
          const active = stage === currentStage;
          return (
            <DropdownMenuItem
              key={stage}
              onSelect={() => selectStage(stage)}
              className={active ? "bg-brand-50/40 text-text-1 dark:bg-surface-2" : "text-text-2"}
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: stageColors.dotColor }}
                  aria-hidden="true"
                />
                {stage}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
