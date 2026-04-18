/** State management for ManualAddForm fields. */

import { useState, useCallback } from "react";

const getTodayString = () => new Date().toISOString().slice(0, 10);

export function useManualAddFormState({ reset }) {
  const [roleTitle, setRoleTitle] = useState("");
  const [company, setCompany] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [dateApplied, setDateApplied] = useState(getTodayString);
  const [stage, setStage] = useState("");
  const [compensation, setCompensation] = useState("");
  const [location, setLocation] = useState("");
  const [remoteStatus, setRemoteStatus] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [tags, setTags] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  const resetForm = useCallback(() => {
    setRoleTitle(""); setCompany(""); setSourceUrl(""); setDateApplied(getTodayString());
    setStage(""); setCompensation(""); setLocation(""); setRemoteStatus(""); setCompanyType(""); setTags([]);
    setFieldErrors({}); reset();
  }, [reset]);

  const applyTemplate = useCallback((template) => {
    const f = template.fields;
    if (f.remote_status) setRemoteStatus(f.remote_status);
    if (f.company_type) setCompanyType(f.company_type);
    if (f.compensation) setCompensation(f.compensation);
    if (f.tags?.length) setTags(f.tags);
  }, []);

  return {
    roleTitle, setRoleTitle, company, setCompany, sourceUrl, setSourceUrl,
    dateApplied, setDateApplied, stage, setStage, compensation, setCompensation,
    location, setLocation, remoteStatus, setRemoteStatus, companyType, setCompanyType,
    tags, setTags, fieldErrors, setFieldErrors, resetForm, applyTemplate,
  };
}
