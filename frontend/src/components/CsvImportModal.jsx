/** Modal for bulk-importing applications from a CSV file. */

import { useRef, useState } from "react";

import Upload from "lucide-react/dist/esm/icons/upload";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import X from "lucide-react/dist/esm/icons/x";

import { useImportApplications } from "../hooks/useApplications";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, MODAL_CARD } from "../lib/designTokens";
import { trackEvent } from "../lib/analytics";

const ACCEPTED_MIME = "text/csv,.csv";
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const SAMPLE_HEADERS = "company,role_title,location,remote_status,compensation,company_type,date_applied";

function CsvImportModal({ isOpen, onClose }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [localError, setLocalError] = useState(null);
  const { mutateAsync, isPending } = useImportApplications();

  function handleFileChange(e) {
    const selected = e.target.files?.[0] ?? null;
    setResult(null);
    setLocalError(null);
    if (selected && selected.size > MAX_FILE_BYTES) {
      setLocalError("File exceeds 2 MB limit.");
      setFile(null);
    } else {
      setFile(selected);
    }
  }

  async function handleImport() {
    if (!file) return;
    setLocalError(null);
    setResult(null);
    try {
      const res = await mutateAsync(file);
      const resultData = res?.data ?? res;
      setResult(resultData);
      trackEvent("csv_imported", {
        count: resultData?.imported ?? 0,
        skipped: resultData?.skipped ?? 0,
      });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setLocalError(err?.response?.data?.error?.message ?? "Import failed. Please try again.");
    }
  }

  function handleClose() {
    setFile(null);
    setResult(null);
    setLocalError(null);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Import CSV"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        data-testid="import-overlay"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className={`relative z-10 w-full max-w-md p-6 ${MODAL_CARD}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Import CSV</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close import modal"
            className="rounded-button p-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Upload a CSV with the following columns (required: <strong>company</strong>,{" "}
          <strong>role_title</strong>):
        </p>
        <code className="mb-4 block overflow-x-auto whitespace-nowrap rounded bg-gray-100 px-3 py-2 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {SAMPLE_HEADERS}
        </code>

        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_MIME}
          onChange={handleFileChange}
          aria-label="CSV file"
          className="mb-4 block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 dark:text-gray-300 dark:file:bg-blue-900/30 dark:file:text-blue-300"
        />

        {localError && (
          <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
            {localError}
          </p>
        )}

        {result && (
          <div role="status" aria-live="polite" className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <p><strong>{result.imported}</strong> imported, <strong>{result.skipped}</strong> skipped.</p>
            {result.warning && <p className="mt-1 text-xs">{result.warning}</p>}
            {result.errors?.length > 0 && (
              <ul className="mt-1 list-inside list-disc text-xs text-red-600 dark:text-red-400">
                {result.errors.slice(0, 5).map((e) => (
                  <li key={e.row}>Row {e.row}: {e.reason}</li>
                ))}
                {result.errors.length > 5 && <li>…and {result.errors.length - 5} more</li>}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className={`${BUTTON_SECONDARY} text-sm`}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!file || isPending}
            aria-label="Import CSV"
            className={`${BUTTON_PRIMARY} text-sm flex items-center gap-2`}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

export default CsvImportModal;
