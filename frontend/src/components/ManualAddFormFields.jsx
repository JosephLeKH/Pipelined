/** All form fields for ManualAddForm — PRD-04 §10.1 single-column layout. */

import { Input } from "./ui/input";
import { DuplicateWarning } from "./DuplicateWarning";
import FormField from "./FormField";
import { ManualAddFormDateRow } from "./ManualAddFormDateRow";
import { ManualAddFormStagePicker } from "./ManualAddFormStagePicker";
import { ManualAddFormSourcePicker } from "./ManualAddFormSourcePicker";
import { ManualAddFormCollapsibleField } from "./ManualAddFormCollapsibleField";

const GENERIC_ERROR_MSG = "Something went wrong. Please try again.";

export function ManualAddFormFields({ hook }) {
  const {
    company, setCompany, roleTitle, setRoleTitle, sourceUrl, setSourceUrl,
    dateApplied, setDateApplied, stage, setStage, stageOptions,
    source, setSource, jobDescription, setJobDescription, notes, setNotes,
    fieldErrors, isDuplicate, existingId, mutationError,
  } = hook;

  return (
    <>
      {isDuplicate && <DuplicateWarning existingId={existingId} />}
      <FormField label="Company *" htmlFor="company" error={fieldErrors.company}>
        <Input
          id="company"
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          aria-required="true"
        />
      </FormField>
      <FormField label="Role title *" htmlFor="role-title" error={fieldErrors.roleTitle}>
        <Input
          id="role-title"
          type="text"
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
          aria-required="true"
        />
      </FormField>
      <ManualAddFormStagePicker
        stageOptions={stageOptions}
        stage={stage}
        setStage={setStage}
      />
      <ManualAddFormDateRow dateApplied={dateApplied} setDateApplied={setDateApplied} />
      <ManualAddFormSourcePicker source={source} setSource={setSource} />
      <FormField label="Job URL" htmlFor="source-url">
        <Input
          id="source-url"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
        />
      </FormField>
      <ManualAddFormCollapsibleField
        label="Job description"
        htmlFor="job-description"
        value={jobDescription}
        onChange={setJobDescription}
        placeholder="Paste the job description…"
      />
      <ManualAddFormCollapsibleField
        label="Notes"
        htmlFor="notes"
        value={notes}
        onChange={setNotes}
        placeholder="Optional notes…"
      />
      {mutationError && !isDuplicate && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {mutationError.message ?? GENERIC_ERROR_MSG}
        </p>
      )}
    </>
  );
}
