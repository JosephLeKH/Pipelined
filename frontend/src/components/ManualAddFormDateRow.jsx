/** Date Applied + Compensation two-column row for ManualAddForm. */

import { INPUT_BASE } from "../lib/designTokens";
import FormField from "./FormField";

export function ManualAddFormDateRow({ dateApplied, setDateApplied, compensation, setCompensation }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField label="Date Applied" htmlFor="date-applied">
        <input
          id="date-applied"
          type="date"
          value={dateApplied}
          onChange={(e) => setDateApplied(e.target.value)}
          className={INPUT_BASE}
        />
      </FormField>
      <FormField label="Compensation" htmlFor="compensation">
        <input
          id="compensation"
          type="text"
          value={compensation}
          onChange={(e) => setCompensation(e.target.value)}
          className={INPUT_BASE}
          placeholder="e.g. $150k"
        />
      </FormField>
    </div>
  );
}
