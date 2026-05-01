/** Date Applied + Compensation two-column row for ManualAddForm. */

import FormField from "./FormField";
import { Input } from "./ui/input";

export function ManualAddFormDateRow({ dateApplied, setDateApplied, compensation, setCompensation }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField label="Date Applied" htmlFor="date-applied">
        <Input
          id="date-applied"
          type="date"
          value={dateApplied}
          onChange={(e) => setDateApplied(e.target.value)}
        />
      </FormField>
      <FormField label="Compensation" htmlFor="compensation">
        <Input
          id="compensation"
          type="text"
          value={compensation}
          onChange={(e) => setCompensation(e.target.value)}
          placeholder="e.g. $150k"
        />
      </FormField>
    </div>
  );
}
