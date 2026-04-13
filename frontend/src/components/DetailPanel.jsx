/** Side panel showing application details, inline notes, stage selector, and stage history. */

import { useState, useEffect, useRef, useCallback } from "react";

import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import X from "lucide-react/dist/esm/icons/x";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";

import { INPUT_BASE } from "../lib/designTokens";
import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { useDeleteApplication, useRestoreApplication, useUpdateApplication } from "../hooks/useApplications";
import { useHotkeys } from "../hooks/useHotkeys";
import ApplicationTimeline from "./ApplicationTimeline";
import CalendarEventsList from "./CalendarEventsList";
import CompanyLogo from "./CompanyLogo";
import ContactsSection from "./ContactsSection";
import NotesEditor from "./NotesEditor";
import ResumeFitSection from "./ResumeFitSection";
import UndoToast from "./UndoToast";
import { formatDate } from "../lib/dateUtils";
import { useAuth } from "../context/AuthContext";
import { trackEvent } from "../lib/analytics";

const FOCUSABLE_SELECTORS = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function DetailField({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500">{label}</span>
      <span className="text-sm text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}

function PanelHeader({ application, onClose, onDelete }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
      <div className="flex items-center gap-3">
        <CompanyLogo company_domain={application.company_domain ?? null} company={application.company ?? ""} size={32} />
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{application.role_title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{application.company}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-400"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1 dark:hover:bg-rose-900/30"
          aria-label="Delete application"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
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

function PanelBody({ application, handleStageChange, handleUpdate, onAddEvent }) {
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
      <FollowUpSection application={application} onUpdate={handleUpdate} />
      <NotesEditor applicationId={application.id} initialValue={application.notes} />
      <ApplicationTimeline stageHistory={application.stage_history} applicationId={application.id} />
      <CalendarEventsList applicationId={application.id} onAddEvent={onAddEvent} />
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

function DetailPanel({ application, onClose, onAddEvent }) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const [undoPendingId, setUndoPendingId] = useState(null);
  const [cachedApp, setCachedApp] = useState(application);
  const { mutate: updateApp } = useUpdateApplication();
  const { mutate: deleteApp } = useDeleteApplication();
  const { mutate: restoreApp } = useRestoreApplication();

  // Keep cachedApp in sync when panel is not in undo mode
  useEffect(() => {
    if (application) setCachedApp(application);
  }, [application]);

  const handleDelete = useCallback(() => {
    if (!cachedApp) return;
    deleteApp(cachedApp.id, {
      onSuccess: () => setUndoPendingId(cachedApp.id),
    });
  }, [cachedApp, deleteApp]);

  const handleUndoDelete = useCallback(() => {
    restoreApp(undoPendingId, {
      onSuccess: () => setUndoPendingId(null),
      onError: () => { setUndoPendingId(null); onClose(); },
    });
  }, [undoPendingId, restoreApp, onClose]);

  const handleUndoDismiss = useCallback(() => {
    setUndoPendingId(null);
    onClose();
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const panelOpen = Boolean(application);
  useHotkeys("s", () => { document.getElementById("stage-select")?.focus(); }, { enabled: panelOpen });
  useHotkeys("n", () => {
    const editBtn = document.querySelector("[aria-label='Edit notes']");
    if (editBtn) { editBtn.click(); } else { document.getElementById("notes-textarea")?.focus(); }
  }, { enabled: panelOpen });

  // Auto-focus first focusable element when panel opens
  useEffect(() => {
    if (application && panelRef.current) {
      const first = panelRef.current.querySelector(FOCUSABLE_SELECTORS);
      first?.focus();
    }
  }, [application]);

  // Trap focus inside panel while open
  const handlePanelKeyDown = useCallback((e) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const els = Array.from(panelRef.current.querySelectorAll(FOCUSABLE_SELECTORS));
    if (!els.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);

  const handleOverlayClick = useCallback(
    (e) => { if (e.target === overlayRef.current) onClose(); },
    [onClose]
  );

  const handleStageChange = useCallback(
    (e) => {
      if (!cachedApp) return;
      const from_stage = cachedApp.current_stage;
      const to_stage = e.target.value;
      updateApp({ id: cachedApp.id, body: { current_stage: to_stage } });
      trackEvent("application_stage_changed", { from_stage, to_stage });
    },
    [cachedApp, updateApp]
  );

  const handleUpdate = useCallback(
    (body) => { if (cachedApp) updateApp({ id: cachedApp.id, body }); },
    [cachedApp, updateApp]
  );

  const displayApp = application ?? cachedApp;
  const isOpen = Boolean(application) || Boolean(undoPendingId);

  return (
    <div
      ref={overlayRef}
      data-testid="panel-overlay"
      className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={handleOverlayClick}
    >
      <div
        ref={panelRef}
        className={`fixed inset-x-0 bottom-0 h-[90vh] rounded-t-xl bg-white shadow-xl transition-transform duration-[250ms] md:inset-x-auto md:bottom-auto md:right-0 md:top-0 md:h-full md:w-[480px] md:rounded-none dark:bg-slate-800 ${
          isOpen
            ? "translate-y-0 md:translate-x-0"
            : "translate-y-full md:translate-y-0 md:translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Application details"
        onKeyDown={handlePanelKeyDown}
      >
        {displayApp && (
          <div key={displayApp.id} className="flex h-full flex-col overflow-y-auto animate-slideInRight">
            <PanelHeader application={displayApp} onClose={onClose} onDelete={handleDelete} />
            <PanelBody
              application={displayApp}
              handleStageChange={handleStageChange}
              handleUpdate={handleUpdate}
              onAddEvent={onAddEvent}
            />
          </div>
        )}
        {undoPendingId && (
          <UndoToast
            message="Application deleted."
            onUndo={handleUndoDelete}
            onDismiss={handleUndoDismiss}
          />
        )}
      </div>
    </div>
  );
}

export default DetailPanel;
