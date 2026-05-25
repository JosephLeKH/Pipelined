/** State management for ManualAddForm fields. */

import { useState, useCallback } from "react";

const getTodayString = () => new Date().toISOString().slice(0, 10);
const DEFAULT_SOURCE = "manual";

export function useManualAddFormState({ reset }) {
  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [dateApplied, setDateApplied] = useState(getTodayString);
  const [stage, setStage] = useState("");
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [jobDescription, setJobDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const resetForm = useCallback(() => {
    setCompany("");
    setRoleTitle("");
    setSourceUrl("");
    setDateApplied(getTodayString());
    setStage("");
    setSource(DEFAULT_SOURCE);
    setJobDescription("");
    setNotes("");
    setFieldErrors({});
    reset();
  }, [reset]);

  return {
    company, setCompany, roleTitle, setRoleTitle, sourceUrl, setSourceUrl,
    dateApplied, setDateApplied, stage, setStage, source, setSource,
    jobDescription, setJobDescription, notes, setNotes,
    fieldErrors, setFieldErrors, resetForm,
  };
}
