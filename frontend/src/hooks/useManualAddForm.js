/** Composition hook: state + dialog + submit logic for ManualAddForm. */

import { useCallback, useEffect } from "react";

import { updateApplication } from "../api/applications";
import { useCreateApplication } from "./useApplications";
import { useAuth } from "../context/AuthContext";
import { trackEvent } from "../lib/analytics";
import { useManualAddFormState } from "./useManualAddFormState";
import { useManualAddFormDialog } from "./useManualAddFormDialog";

const DUPLICATE_CODE = "DUPLICATE_APPLICATION";

const buildBody = ({
  roleTitle, company, sourceUrl, dateApplied, stage, source, jobDescription,
}) => ({
  role_title: roleTitle.trim(),
  company: company.trim(),
  source,
  date_applied: dateApplied,
  ...(stage && { current_stage: stage }),
  ...(sourceUrl.trim() && { source_url: sourceUrl.trim() }),
  ...(jobDescription.trim() && { job_description: jobDescription.trim() }),
});

export function useManualAddForm({ isOpen, onClose, initialStage = "" }) {
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
    const errors = {};
    if (!roleTitle.trim()) errors.roleTitle = "Role title is required";
    if (!company.trim()) errors.company = "Company is required";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    mutate(buildBody({ roleTitle, company, sourceUrl, dateApplied, stage, source, jobDescription }), {
      onSuccess: async (created) => {
        trackEvent("application_created", { source });
        if (notes.trim() && created?.id) {
          await updateApplication(created.id, { notes: notes.trim() });
        }
        handleClose();
      },
    });
  }, [
    roleTitle, company, sourceUrl, dateApplied, stage, source, jobDescription, notes,
    mutate, handleClose, setFieldErrors,
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
