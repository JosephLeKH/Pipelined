/** All form fields for ManualAddForm — rendered inside the <form> element. */

import { INPUT_BASE } from "../lib/designTokens";
import { DuplicateWarning } from "./DuplicateWarning";
import { FormActions } from "./FormActions";
import FormField from "./FormField";
import TagInput from "./TagInput";
import TemplateBar from "./TemplateBar";
import { ManualAddFormDateRow } from "./ManualAddFormDateRow";
import { ManualAddFormCategoryRow } from "./ManualAddFormCategoryRow";

const GENERIC_ERROR_MSG = "Something went wrong. Please try again.";

export function ManualAddFormFields({ hook }) {
  const { roleTitle, setRoleTitle, company, setCompany, sourceUrl, setSourceUrl,
          dateApplied, setDateApplied, compensation, setCompensation,
          location, setLocation, stage, setStage, stageOptions,
          remoteStatus, setRemoteStatus, companyType, setCompanyType,
          tags, setTags, fieldErrors, applyTemplate,
          isDuplicate, existingId, mutationError, isPending, handleClose } = hook;
  return (
    <>
      <TemplateBar
        onApply={applyTemplate}
        fields={{ remote_status: remoteStatus || null, company_type: companyType || null, role_type: null, source: null, tags, compensation: compensation || null }}
      />
      {isDuplicate && <DuplicateWarning existingId={existingId} />}
      <FormField label="Role Title *" htmlFor="role-title" error={fieldErrors.roleTitle}>
        <input id="role-title" type="text" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} className={INPUT_BASE} aria-required="true" />
      </FormField>
      <FormField label="Company *" htmlFor="company" error={fieldErrors.company}>
        <input id="company" type="text" value={company} onChange={(e) => setCompany(e.target.value)} className={INPUT_BASE} aria-required="true" />
      </FormField>
      <FormField label="Job URL" htmlFor="source-url">
        <input id="source-url" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className={INPUT_BASE} />
      </FormField>
      <ManualAddFormDateRow dateApplied={dateApplied} setDateApplied={setDateApplied} compensation={compensation} setCompensation={setCompensation} />
      <FormField label="Location" htmlFor="location">
        <input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={INPUT_BASE} />
      </FormField>
      {stageOptions.length > 0 && (
        <FormField label="Initial Stage" htmlFor="initial-stage">
          <select id="initial-stage" value={stage} onChange={(e) => setStage(e.target.value)} className={INPUT_BASE}>
            <option value="">Default ({stageOptions[0]})</option>
            {stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
      )}
      <ManualAddFormCategoryRow remoteStatus={remoteStatus} setRemoteStatus={setRemoteStatus} companyType={companyType} setCompanyType={setCompanyType} />
      <FormField label="Tags" htmlFor="tags">
        <TagInput id="tags" value={tags} onChange={setTags} />
      </FormField>
      {mutationError && !isDuplicate && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {mutationError.message ?? GENERIC_ERROR_MSG}
        </p>
      )}
      <FormActions isPending={isPending} onCancel={handleClose} />
    </>
  );
}
