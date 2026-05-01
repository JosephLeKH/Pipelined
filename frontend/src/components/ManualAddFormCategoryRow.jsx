/** Remote Status + Company Type two-column row for ManualAddForm. */

import { REMOTE_STATUS_OPTIONS, COMPANY_TYPE_OPTIONS } from "../lib/constants";
import FormField from "./FormField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function ManualAddFormCategoryRow({ remoteStatus, setRemoteStatus, companyType, setCompanyType }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField label="Remote Status" htmlFor="remote-status">
        <Select value={remoteStatus || undefined} onValueChange={setRemoteStatus}>
          <SelectTrigger id="remote-status">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {REMOTE_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Company Type" htmlFor="company-type">
        <Select value={companyType || undefined} onValueChange={setCompanyType}>
          <SelectTrigger id="company-type">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {COMPANY_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </div>
  );
}
