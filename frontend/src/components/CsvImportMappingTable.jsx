/** Step 2 — map source CSV columns to application fields. */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { CSV_IMPORT_TARGET_FIELDS } from "../lib/csvImport";

export function CsvImportMappingTable({ headers, mapping, onMappingChange }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead>
          <tr className="border-b border-border-1 text-xs font-medium uppercase tracking-wide text-text-3">
            <th className="pb-2 pr-4 font-medium">Target field</th>
            <th className="pb-2 font-medium">CSV column</th>
          </tr>
        </thead>
        <tbody>
          {CSV_IMPORT_TARGET_FIELDS.map((field) => (
            <tr key={field.key} className="border-b border-border-1">
              <td className="py-2.5 pr-4 text-text-1">
                {field.label}
                {field.required && (
                  <span className="ml-1 text-brand-700" aria-hidden="true">
                    *
                  </span>
                )}
              </td>
              <td className="py-2">
                <Select
                  value={mapping[field.key] || "__skip__"}
                  onValueChange={(value) => onMappingChange(field.key, value)}
                >
                  <SelectTrigger aria-label={`Map ${field.label}`}>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__skip__">Skip</SelectItem>
                    {headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
