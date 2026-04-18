/** Remote Status + Company Type two-column row for ManualAddForm. */

import { INPUT_BASE } from "../lib/designTokens";
import { REMOTE_STATUS_OPTIONS, COMPANY_TYPE_OPTIONS } from "../lib/constants";
import FormField from "./FormField";

export function ManualAddFormCategoryRow({ remoteStatus, setRemoteStatus, companyType, setCompanyType }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField label="Remote Status" htmlFor="remote-status">
        <select
          id="remote-status"
          value={remoteStatus}
          onChange={(e) => setRemoteStatus(e.target.value)}
          className={INPUT_BASE}
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
          className={INPUT_BASE}
        >
          <option value="">Select...</option>
          {COMPANY_TYPE_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </FormField>
    </div>
  );
}
