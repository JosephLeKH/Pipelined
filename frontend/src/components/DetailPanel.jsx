/** Side panel showing application details, inline notes, stage selector, and stage history. */

import { useState, useEffect, useRef, useCallback } from "react";

import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import X from "lucide-react/dist/esm/icons/x";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";

import { useDeleteApplication, useRestoreApplication, useUpdateApplication } from "../hooks/useApplications";
import { useApplicationEvents, useDeleteEvent } from "../hooks/useCalendar";
import { useHotkeys } from "../hooks/useHotkeys";
import ApplicationTimeline from "./ApplicationTimeline";
import FitBadge from "./FitBadge";
import NotesEditor from "./NotesEditor";
import UndoToast from "./UndoToast";
import {
  EVENT_TYPE_COLORS,
  DEFAULT_EVENT_COLOR,
} from "../lib/constants";
import { formatDate } from "../lib/dateUtils";
import { useAuth } from "../context/AuthContext";

const FOCUSABLE_SELECTORS = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function DetailField({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">{label}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200">{value}</span>
    </div>
  );
}


function CalendarEventsList({ applicationId, onAddEvent }) {
  const { data, isLoading } = useApplicationEvents(applicationId);
  const { mutate: deleteEvent } = useDeleteEvent();

  const events = Array.isArray(data) ? data : (data?.data ?? []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">Interviews & Events</span>
        <button
          type="button"
          onClick={() => onAddEvent(applicationId)}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:hover:bg-blue-900/30"
          aria-label="Add event"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Event
        </button>
      </div>
      {isLoading && <p className="text-xs text-gray-400">Loading…</p>}
      {!isLoading && events.length === 0 && (
        <p className="text-xs text-gray-400">No events yet.</p>
      )}
      {events.map((ev) => {
        const colors = EVENT_TYPE_COLORS[ev.event_type] ?? DEFAULT_EVENT_COLOR;
        return (
          <div key={ev.id} className="flex items-center justify-between rounded border border-gray-100 px-3 py-2 dark:border-gray-700">
            <div className="flex flex-col gap-0.5">
              <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                {ev.event_type.replace("_", " ")}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {ev.date}{ev.time ? ` · ${ev.time}` : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => deleteEvent(ev.id)}
              className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
              aria-label="Delete event"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function PanelHeader({ application, onClose, onDelete }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{application.role_title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{application.company}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          aria-label="Close panel"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 dark:hover:bg-red-900/30"
          aria-label="Delete application"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PanelBody({ application, handleStageChange, onAddEvent }) {
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
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          aria-label="Job posting"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Job posting
        </a>
      )}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500" htmlFor="stage-select">
          Stage
        </label>
        <select
          id="stage-select"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          value={application.current_stage}
          onChange={handleStageChange}
        >
          {stageOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
          {!stageOptions.includes(application.current_stage) && (
            <option key={application.current_stage} value={application.current_stage}>
              {application.current_stage}
            </option>
          )}
        </select>
      </div>
      <NotesEditor applicationId={application.id} initialValue={application.notes} />
      <ApplicationTimeline stageHistory={application.stage_history} applicationId={application.id} />
      <CalendarEventsList applicationId={application.id} onAddEvent={onAddEvent} />
      {application.ai_analysis && (
        <ResumeFitSection analysis={application.ai_analysis} />
      )}
    </div>
  );
}

function ResumeFitSection({ analysis }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">Resume Fit</span>
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {analysis.fit_score ?? "—"}
        </span>
        <FitBadge score={analysis.fit_score} />
      </div>
      {analysis.summary && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{analysis.summary}</p>
      )}
      {analysis.matched_skills?.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Matched skills</span>
          <div className="flex flex-wrap gap-1">
            {analysis.matched_skills.map((skill) => (
              <span key={skill} className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-400">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
      {analysis.missing_skills?.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Missing skills</span>
          <div className="flex flex-wrap gap-1">
            {analysis.missing_skills.map((skill) => (
              <span key={skill} className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/40 dark:text-red-400">
                {skill}
              </span>
            ))}
          </div>
        </div>
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
    (e) => { if (cachedApp) updateApp({ id: cachedApp.id, body: { current_stage: e.target.value } }); },
    [cachedApp, updateApp]
  );

  const displayApp = application ?? cachedApp;
  const isOpen = Boolean(application) || Boolean(undoPendingId);

  return (
    <div
      ref={overlayRef}
      data-testid="panel-overlay"
      className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={handleOverlayClick}
    >
      <div
        ref={panelRef}
        className={`fixed inset-x-0 bottom-0 h-[90vh] rounded-t-xl bg-white shadow-xl transition-transform duration-[250ms] md:inset-x-auto md:bottom-auto md:right-0 md:top-0 md:h-full md:w-[480px] md:rounded-none dark:bg-gray-800 ${
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
          <div key={displayApp.id} className="flex h-full flex-col overflow-y-auto">
            <PanelHeader application={displayApp} onClose={onClose} onDelete={handleDelete} />
            <PanelBody
              application={displayApp}
              handleStageChange={handleStageChange}
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
