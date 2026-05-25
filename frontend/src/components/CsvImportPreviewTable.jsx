/** Step 3 — preview first mapped rows before import. */

import { CSV_IMPORT_TARGET_FIELDS, getMappedPreviewRows } from "../lib/csvImport";

export function CsvImportPreviewTable({ parsed, mapping }) {
  const previewRows = getMappedPreviewRows(parsed, mapping);
  const visibleFields = CSV_IMPORT_TARGET_FIELDS.filter((field) => mapping[field.key]);

  if (visibleFields.length === 0) {
    return <p className="text-sm text-text-3">Map at least one column to preview rows.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead>
          <tr className="border-b border-border-1 text-xs font-medium uppercase tracking-wide text-text-3">
            {visibleFields.map((field) => (
              <th key={field.key} className="pb-2 pr-4 font-medium">
                {field.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {previewRows.map((row, index) => (
            <tr key={index} className="border-b border-border-1">
              {visibleFields.map((field) => (
                <td key={field.key} className="max-w-[10rem] truncate py-2 pr-4 text-text-2">
                  {row[field.key] || "N/A"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-text-3">
        Showing first {previewRows.length} of {parsed.rows.length} rows.
      </p>
    </div>
  );
}
