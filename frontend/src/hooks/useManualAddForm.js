/** Composition hook: state + dialog + submit logic for ManualAddForm. */

import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { updateApplication } from "../api/applications";
import { useCreateApplication } from "./useApplications";
import { useAuth } from "../context/AuthContext";
import { trackEvent } from "../lib/analytics";
import { useManualAddFormState } from "./useManualAddFormState";
import { useManualAddFormDialog } from "./useManualAddFormDialog";

const DUPLICATE_CODE = "DUPLICATE_APPLICATION";

// HTML <input type="date"> yields "YYYY-MM-DD"; backend's strict Pydantic
// schema requires a full ISO datetime, so convert at the boundary.
const toIsoDatetime = (dateStr) => {
  if (!dateStr) return undefined;
  const parsed = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const buildBody = ({
  roleTitle, company, sourceUrl, dateApplied, stage, source, jobDescription,
}) => ({
  role_title: roleTitle.trim(),
  company: company.trim(),
  source,
  ...(toIsoDatetime(dateApplied) && { date_applied: toIsoDatetime(dateApplied) }),
  ...(stage && { current_stage: stage }),
  ...(sourceUrl.trim() && { source_url: sourceUrl.trim() }),
  ...(jobDescription.trim() && { job_description: jobDescription.trim() }),
});

export function useManualAddForm({ isOpen, onClose, initialStage = "" }) {
  const queryClient = useQueryClient();
  const { mutate, isPending, error: mutationError, reset } = useCreateApplication();
  const { user } = useAuth();
  const stageOptions = user?.default_stages ?? [];
  const formState = useManualAddFormState({ reset });
  const {
    resetForm, setFieldErrors, roleTitle, company, sourceUrl, dateApplied,
    stage, setStage, source, jobDescription, notes,
  } = formState;

  useEffect(() => {
    if (isOpen && initialStage) setStage(initialStage);
  }, [isOpen, initialStage, setStage]);

  const isDuplicate = mutationError?.code === DUPLICATE_CODE;
  const existingId = mutationError?.details?.existing_id;

  const handleClose = useCallback(() => { resetForm(); onClose(); }, [resetForm, onClose]);
  const { overlayRef, dialogRef, handleDialogKeyDown, handleOverlayClick } =
    useManualAddFormDialog({ isOpen, handleClose });

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (isPending) return;
    const errors = {};
    if (!roleTitle.trim()) errors.roleTitle = "Role title is required";
    if (!company.trim()) errors.company = "Company is required";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    mutate(buildBody({ roleTitle, company, sourceUrl, dateApplied, stage, source, jobDescription }), {
      onSuccess: async (created) => {
        trackEvent("application_created", { source });
        if (notes.trim() && created?.id) {
          try {
            await updateApplication(created.id, { notes: notes.trim() });
            queryClient.invalidateQueries({ queryKey: ["applications", created.id] });
            queryClient.invalidateQueries({ queryKey: ["applications"] });
          } catch {
            toast.error("Application created, but notes failed to save — please re-enter them in the detail panel.");
          }
        }
        handleClose();
      },
    });
  }, [
    roleTitle, company, sourceUrl, dateApplied, stage, source, jobDescription, notes, isPending,
    mutate, handleClose, setFieldErrors, queryClient,
  ]);

  return {
    ...formState,
    overlayRef,
    dialogRef,
    stageOptions,
    isDuplicate,
    existingId,
    isPending,
    mutationError,
    handleClose,
    handleDialogKeyDown,
    handleOverlayClick,
    handleSubmit,
  };
}
