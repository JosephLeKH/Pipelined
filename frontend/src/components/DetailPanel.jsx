/** Side panel showing application details, inline notes, stage selector, and stage history. */

import { useEffect, useRef, useCallback } from "react";

import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import X from "lucide-react/dist/esm/icons/x";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";

import { useUpdateApplication } from "../hooks/useApplications";
import { useApplicationEvents, useDeleteEvent } from "../hooks/useCalendar";
import { STAGE_COLORS, DEFAULT_STAGE_COLOR, EVENT_TYPE_COLORS, DEFAULT_EVENT_COLOR } from "../lib/constants";

const STAGE_OPTIONS = Object.keys(STAGE_COLORS);

function DetailField({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase text-gray-400">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}

function StageHistoryList({ history }) {
  if (!history?.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase text-gray-400">Stage History</span>
      <ol className="flex flex-col gap-2" data-testid="stage-history">
        {history.map((entry, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STAGE_COLORS[entry.stage]?.dot ?? DEFAULT_STAGE_COLOR.dot}`}
            />
            <div className="flex flex-col">
              <span className="font-medium text-gray-800">{entry.stage}</span>
              <span className="text-xs text-gray-400">
                {new Date(entry.transitioned_at).toLocaleDateString()}
              </span>
            </div>
          </li>
        ))}
      </ol>
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
        <span className="text-xs font-medium uppercase text-gray-400">Interviews & Events</span>
        <button
          type="button"
          onClick={() => onAddEvent(applicationId)}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
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
          <div key={ev.id} className="flex items-center justify-between rounded border border-gray-100 px-3 py-2">
            <div className="flex flex-col gap-0.5">
              <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                {ev.event_type.replace("_", " ")}
              </span>
              <span className="text-xs text-gray-500">
                {ev.date}{ev.time ? ` · ${ev.time}` : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => deleteEvent(ev.id)}
              className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
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

function PanelHeader({ application, onClose }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{application.role_title}</h2>
        <p className="text-sm text-gray-500">{application.company}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Close panel"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function PanelBody({ application, handleNotesBlur, handleStageChange, onAddEvent }) {
  const dateApplied = new Date(application.date_applied).toLocaleDateString();
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
        <label className="text-xs font-medium uppercase text-gray-400" htmlFor="stage-select">
          Stage
        </label>
        <select
          id="stage-select"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-800"
          value={application.current_stage}
          onChange={handleStageChange}
        >
          {STAGE_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase text-gray-400" htmlFor="notes-textarea">
          Notes
        </label>
        <textarea
          id="notes-textarea"
          className="min-h-[120px] resize-y rounded border border-gray-300 px-3 py-2 text-sm"
          defaultValue={application.notes ?? ""}
          onBlur={handleNotesBlur}
        />
      </div>
      <StageHistoryList history={application.stage_history} />
      <CalendarEventsList applicationId={application.id} onAddEvent={onAddEvent} />
    </div>
  );
}

function DetailPanel({ application, onClose, onAddEvent }) {
  const overlayRef = useRef(null);
  const { mutate: updateApp } = useUpdateApplication();

  const handleKeyDown = useCallback(
    (e) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleOverlayClick = useCallback(
    (e) => { if (e.target === overlayRef.current) onClose(); },
    [onClose]
  );

  const handleNotesBlur = useCallback(
    (e) => { if (application) updateApp({ id: application.id, body: { notes: e.target.value } }); },
    [application, updateApp]
  );

  const handleStageChange = useCallback(
    (e) => { if (application) updateApp({ id: application.id, body: { current_stage: e.target.value } }); },
    [application, updateApp]
  );

  const isOpen = Boolean(application);

  return (
    <div
      ref={overlayRef}
      data-testid="panel-overlay"
      className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={handleOverlayClick}
    >
      <div
        className={`fixed right-0 top-0 h-full w-full bg-white shadow-xl transition-transform duration-[250ms] md:w-[480px] ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Application details"
      >
        {application && (
          <div key={application.id} className="flex h-full flex-col overflow-y-auto">
            <PanelHeader application={application} onClose={onClose} />
            <PanelBody
              application={application}
              handleNotesBlur={handleNotesBlur}
              handleStageChange={handleStageChange}
              onAddEvent={onAddEvent}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default DetailPanel;
