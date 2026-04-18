/** Composition hook: state + dialog + submit logic for ManualAddForm. */

import { useCallback } from "react";

import { useCreateApplication } from "./useApplications";
import { useAuth } from "../context/AuthContext";
import { trackEvent } from "../lib/analytics";
import { useManualAddFormState } from "./useManualAddFormState";
import { useManualAddFormDialog } from "./useManualAddFormDialog";

const MANUAL_SOURCE = "manual";
const DUPLICATE_CODE = "DUPLICATE_APPLICATION";

const buildBody = ({ roleTitle, company, sourceUrl, dateApplied, stage, compensation, location, remoteStatus, companyType, tags }) => ({
  role_title: roleTitle.trim(), company: company.trim(), source: MANUAL_SOURCE, date_applied: dateApplied,
  ...(stage && { current_stage: stage }), ...(sourceUrl.trim() && { source_url: sourceUrl.trim() }),
  ...(compensation.trim() && { compensation: compensation.trim() }), ...(location.trim() && { location: location.trim() }),
  ...(remoteStatus && { remote_status: remoteStatus }), ...(companyType && { company_type: companyType }),
  tags,
});

export function useManualAddForm({ isOpen, onClose }) {
  const { mutate, isPending, error: mutationError, reset } = useCreateApplication();
  const { user } = useAuth();
  const stageOptions = user?.default_stages ?? [];
  const formState = useManualAddFormState({ reset });
  const { resetForm, setFieldErrors, roleTitle, company, sourceUrl, dateApplied,
          stage, compensation, location, remoteStatus, companyType, tags } = formState;
  const isDuplicate = mutationError?.code === DUPLICATE_CODE;
  const existingId = mutationError?.details?.existing_id;

  const handleClose = useCallback(() => { resetForm(); onClose(); }, [resetForm, onClose]);
  const { overlayRef, dialogRef, handleDialogKeyDown, handleOverlayClick } = useManualAddFormDialog({ isOpen, handleClose });

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const errors = {};
    if (!roleTitle.trim()) errors.roleTitle = "Role title is required";
    if (!company.trim()) errors.company = "Company is required";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    mutate(buildBody({ roleTitle, company, sourceUrl, dateApplied, stage, compensation, location, remoteStatus, companyType, tags }), {
      onSuccess: () => { trackEvent("application_created", { source: "manual" }); handleClose(); },
    });
  }, [roleTitle, company, sourceUrl, dateApplied, stage, compensation, location, remoteStatus, companyType, tags, mutate, handleClose, setFieldErrors]);

  return { ...formState, overlayRef, dialogRef, stageOptions, isDuplicate, existingId, isPending, mutationError, handleClose, handleDialogKeyDown, handleOverlayClick, handleSubmit };
}
