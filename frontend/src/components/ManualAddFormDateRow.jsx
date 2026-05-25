/** Date Applied field for ManualAddForm — 32 px input height. */

import FormField from "./FormField";
import { Input } from "./ui/input";

export function ManualAddFormDateRow({ dateApplied, setDateApplied }) {
  return (
    <FormField label="Date applied" htmlFor="date-applied">
      <Input
        id="date-applied"
        type="date"
        value={dateApplied}
        onChange={(e) => setDateApplied(e.target.value)}
        className="h-8"
      />
    </FormField>
  );
}
