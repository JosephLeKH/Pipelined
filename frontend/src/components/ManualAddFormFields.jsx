/** All form fields for ManualAddForm — rendered inside the <form> element. */

import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { DuplicateWarning } from "./DuplicateWarning";
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
          isDuplicate, existingId, mutationError } = hook;
  return (
    <>
      <TemplateBar
        onApply={applyTemplate}
        fields={{ remote_status: remoteStatus || null, company_type: companyType || null, role_type: null, source: null, tags, compensation: compensation || null }}
      />
      {isDuplicate && <DuplicateWarning existingId={existingId} />}
      <FormField label="Role Title *" htmlFor="role-title" error={fieldErrors.roleTitle}>
        <Input id="role-title" type="text" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} aria-required="true" />
      </FormField>
      <FormField label="Company *" htmlFor="company" error={fieldErrors.company}>
        <Input id="company" type="text" value={company} onChange={(e) => setCompany(e.target.value)} aria-required="true" />
      </FormField>
      <FormField label="Job URL" htmlFor="source-url">
        <Input id="source-url" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
      </FormField>
      <ManualAddFormDateRow dateApplied={dateApplied} setDateApplied={setDateApplied} compensation={compensation} setCompensation={setCompensation} />
      <FormField label="Location" htmlFor="location">
        <Input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
      </FormField>
      {stageOptions.length > 0 && (
        <FormField label="Initial Stage" htmlFor="initial-stage">
          <Select value={stage || undefined} onValueChange={setStage}>
            <SelectTrigger id="initial-stage">
              <SelectValue placeholder={`Default (${stageOptions[0]})`} />
            </SelectTrigger>
            <SelectContent>
              {stageOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
      )}
      <ManualAddFormCategoryRow remoteStatus={remoteStatus} setRemoteStatus={setRemoteStatus} companyType={companyType} setCompanyType={setCompanyType} />
      <FormField label="Tags" htmlFor="tags">
        <TagInput id="tags" value={tags} onChange={setTags} />
      </FormField>
      {mutationError && !isDuplicate && (
        <p role="alert" className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {mutationError.message ?? GENERIC_ERROR_MSG}
        </p>
      )}
    </>
  );
}
