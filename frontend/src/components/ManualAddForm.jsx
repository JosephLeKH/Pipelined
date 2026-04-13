/** Modal form for manually adding a job application without the browser extension. */

import { useState, useEffect, useRef, useCallback } from "react";

import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import X from "lucide-react/dist/esm/icons/x";

import { useCreateApplication } from "../hooks/useApplications";
import { REMOTE_STATUS_OPTIONS, COMPANY_TYPE_OPTIONS } from "../lib/constants";
import { trackEvent } from "../lib/analytics";
import { useAuth } from "../context/AuthContext";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT_BASE, MODAL_BACKDROP, MODAL_CARD } from "../lib/designTokens";

const GENERIC_ERROR_MSG = "Something went wrong. Please try again.";

const MANUAL_SOURCE = "manual";
const DUPLICATE_CODE = "DUPLICATE_APPLICATION";
const FOCUSABLE_SELECTORS = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function FormField({ label, htmlFor, children, error }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ManualAddForm({ isOpen, onClose }) {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const { mutate, isPending, error: mutationError, reset } = useCreateApplication();
  const { user } = useAuth();
  const stageOptions = user?.default_stages ?? [];

  const [roleTitle, setRoleTitle] = useState("");
  const [company, setCompany] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [dateApplied, setDateApplied] = useState(getTodayString);
  const [stage, setStage] = useState("");
  const [compensation, setCompensation] = useState("");
  const [location, setLocation] = useState("");
  const [remoteStatus, setRemoteStatus] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [tags, setTags] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const isDuplicate = mutationError?.code === DUPLICATE_CODE;
  const existingId = mutationError?.details?.existing_id;

  const resetForm = useCallback(() => {
    setRoleTitle("");
    setCompany("");
    setSourceUrl("");
    setDateApplied(getTodayString());
    setStage("");
    setCompensation("");
    setLocation("");
    setRemoteStatus("");
    setCompanyType("");
    setTags("");
    setFieldErrors({});
    reset();
  }, [reset]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleKeyDown = useCallback(
    (e) => { if (e.key === "Escape") handleClose(); },
    [handleClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Auto-focus first focusable element when modal opens
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      const first = dialogRef.current.querySelector(FOCUSABLE_SELECTORS);
      first?.focus();
    }
  }, [isOpen]);

  // Trap focus inside dialog while open
  const handleDialogKeyDown = useCallback((e) => {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const els = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE_SELECTORS));
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
    (e) => { if (e.target === overlayRef.current) handleClose(); },
    [handleClose]
  );

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const errors = {};
      if (!roleTitle.trim()) errors.roleTitle = "Role title is required";
      if (!company.trim()) errors.company = "Company is required";
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});

      const body = {
        role_title: roleTitle.trim(),
        company: company.trim(),
        source: MANUAL_SOURCE,
        date_applied: dateApplied,
        ...(stage && { current_stage: stage }),
        ...(sourceUrl.trim() && { source_url: sourceUrl.trim() }),
        ...(compensation.trim() && { compensation: compensation.trim() }),
        ...(location.trim() && { location: location.trim() }),
        ...(remoteStatus && { remote_status: remoteStatus }),
        ...(companyType && { company_type: companyType }),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      };

      mutate(body, {
        onSuccess: () => {
          trackEvent("application_created", { source: "manual" });
          handleClose();
        },
      });
    },
    [
      roleTitle, company, sourceUrl, dateApplied, stage, compensation,
      location, remoteStatus, companyType, tags, mutate, handleClose,
    ]
  );

  return (
    <div
      ref={overlayRef}
      data-testid="modal-overlay"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-modal animate-scaleIn dark:bg-slate-800 dark:border dark:border-slate-700"
        role="dialog"
        aria-modal="true"
        aria-label="Add application"
        onKeyDown={handleDialogKeyDown}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Application</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-button p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 px-6 py-4">
          {isDuplicate && (
            <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              An application for this role and company already exists.{" "}
              <a
                href={`/dashboard?application=${existingId}`}
                className="font-medium underline hover:text-amber-900"
              >
                View existing application
              </a>
            </div>
          )}
          <FormField label="Role Title *" htmlFor="role-title" error={fieldErrors.roleTitle}>
            <input
              id="role-title"
              type="text"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              className={`${INPUT_BASE}`}
              aria-required="true"
            />
          </FormField>
          <FormField label="Company *" htmlFor="company" error={fieldErrors.company}>
            <input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={`${INPUT_BASE}`}
              aria-required="true"
            />
          </FormField>
          <FormField label="Job URL" htmlFor="source-url">
            <input
              id="source-url"
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className={`${INPUT_BASE}`}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date Applied" htmlFor="date-applied">
              <input
                id="date-applied"
                type="date"
                value={dateApplied}
                onChange={(e) => setDateApplied(e.target.value)}
                className={`${INPUT_BASE}`}
              />
            </FormField>
            <FormField label="Compensation" htmlFor="compensation">
              <input
                id="compensation"
                type="text"
                value={compensation}
                onChange={(e) => setCompensation(e.target.value)}
                className={`${INPUT_BASE}`}
                placeholder="e.g. $150k"
              />
            </FormField>
          </div>
          <FormField label="Location" htmlFor="location">
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={`${INPUT_BASE}`}
            />
          </FormField>
          {stageOptions.length > 0 && (
            <FormField label="Initial Stage" htmlFor="initial-stage">
              <select
                id="initial-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className={`${INPUT_BASE}`}
              >
                <option value="">Default ({stageOptions[0]})</option>
                {stageOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FormField>
          )}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Remote Status" htmlFor="remote-status">
              <select
                id="remote-status"
                value={remoteStatus}
                onChange={(e) => setRemoteStatus(e.target.value)}
                className={`${INPUT_BASE}`}
              >
                <option value="">Select...</option>
                {REMOTE_STATUS_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Company Type" htmlFor="company-type">
              <select
                id="company-type"
                value={companyType}
                onChange={(e) => setCompanyType(e.target.value)}
                className={`${INPUT_BASE}`}
              >
                <option value="">Select...</option>
                {COMPANY_TYPE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Tags" htmlFor="tags">
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className={`${INPUT_BASE}`}
              placeholder="Comma-separated, e.g. python, remote"
            />
          </FormField>
          {mutationError && !isDuplicate && (
            <p role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {mutationError.message ?? GENERIC_ERROR_MSG}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
            <button
              type="button"
              onClick={handleClose}
              className={`${BUTTON_SECONDARY} text-sm`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`${BUTTON_PRIMARY} text-sm flex items-center gap-2`}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Creating…
                </>
              ) : (
                "Add Application"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ManualAddForm;
