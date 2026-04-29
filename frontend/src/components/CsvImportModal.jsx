/** Modal for bulk-importing applications from a CSV file. */

import { useRef, useState, useEffect } from "react";

import Upload from "lucide-react/dist/esm/icons/upload";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import X from "lucide-react/dist/esm/icons/x";

import { useImportApplications } from "../hooks/useApplications";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_GHOST, MODAL_CARD, MODAL_BACKDROP, SUCCESS_BANNER } from "../lib/designTokens";
import { trackEvent } from "../lib/analytics";

const ACCEPTED_MIME = "text/csv,.csv";
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_FILE_MB = MAX_FILE_BYTES / 1024 / 1024;
const ERRORS_COLLAPSE_THRESHOLD = 5;
const SAMPLE_HEADERS = "company,role_title,location,remote_status,compensation,company_type,date_applied";

function useCsvImport(onClose) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [errorsExpanded, setErrorsExpanded] = useState(false);
  const { mutateAsync, isPending } = useImportApplications();

  function handleFileChange(e) {
    const f = e.target.files?.[0] ?? null;
    setResult(null); setLocalError(null);
    if (f?.size > MAX_FILE_BYTES) { setLocalError(`${MAX_FILE_MB} MB max — this file is ${(f.size / 1024 / 1024).toFixed(1)} MB.`); setFile(null); }
    else { setFile(f); }
  }

  async function handleImport() {
    if (!file) return;
    setLocalError(null); setResult(null);
    try {
      const res = await mutateAsync(file);
      const resultData = res?.data ?? res;
      setResult(resultData);
      trackEvent("csv_imported", { count: resultData?.imported ?? 0, skipped: resultData?.skipped ?? 0 });
      setFile(null); setErrorsExpanded(false);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setLocalError(err?.response?.data?.error?.message ?? "Import failed. Please try again.");
    }
  }

  function handleClose() {
    setFile(null); setResult(null); setLocalError(null);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  }

  return { fileRef, file, result, localError, errorsExpanded, setErrorsExpanded, isPending, handleFileChange, handleImport, handleClose };
}

function ImportResultDisplay({ result, errorsExpanded, setErrorsExpanded }) {
  if (!result) return null;
  return (
    <div role="status" aria-live="polite" className={`mb-4 ${SUCCESS_BANNER}`}>
      <p><strong>{result.imported}</strong> imported, <strong>{result.skipped}</strong> skipped.</p>
      {result.warning && <p className="mt-1 text-xs">{result.warning}</p>}
      {result.errors?.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            {result.errors.length > ERRORS_COLLAPSE_THRESHOLD && (
              <button type="button" onClick={() => setErrorsExpanded((p) => !p)} className="text-xs text-red-600 underline dark:text-red-400">
                {errorsExpanded ? "Hide errors" : `Show all ${result.errors.length} errors`}
              </button>
            )}
            <button type="button" onClick={() => navigator.clipboard.writeText(result.errors.map((e) => `Row ${e.row}: ${e.reason}`).join("\n"))} className="text-xs text-gray-500 underline dark:text-gray-400">
              Copy errors
            </button>
          </div>
          <ul className="mt-1 list-inside list-disc text-xs text-red-600 dark:text-red-400">
            {(errorsExpanded || result.errors.length <= ERRORS_COLLAPSE_THRESHOLD
              ? result.errors
              : result.errors.slice(0, ERRORS_COLLAPSE_THRESHOLD)
            ).map((e) => <li key={e.row}>Row {e.row}: {e.reason}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function CsvImportModal({ isOpen, onClose }) {
  const { fileRef, file, result, localError, errorsExpanded, setErrorsExpanded, isPending, handleFileChange, handleImport, handleClose } = useCsvImport(onClose);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e) { if (e.key === "Escape") handleClose(); }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;
  return (
    <div className={`${MODAL_BACKDROP} cursor-pointer`} role="dialog" aria-modal="true" aria-labelledby="csv-import-heading" onClick={handleClose}>
      <div className={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border-default px-6 py-4">
          <h2 id="csv-import-heading" className="text-base font-display font-semibold text-gray-900 dark:text-gray-100">Import CSV</h2>
          <button type="button" onClick={handleClose} aria-label="Close import modal" className="rounded-button p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:hover:bg-gray-700 dark:hover:text-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            Upload a CSV with the following columns (required: <strong>company</strong>,{" "}
            <strong>role_title</strong>):
          </p>
          <code className="mb-4 block overflow-x-auto whitespace-nowrap rounded bg-gray-100 px-3 py-2 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            {SAMPLE_HEADERS}
          </code>
          <input ref={fileRef} type="file" accept={ACCEPTED_MIME} onChange={handleFileChange} aria-label="CSV file" autoFocus
            className="mb-4 block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:text-gray-300 dark:file:bg-brand-900/30 dark:file:text-brand-300"
          />
          {localError && <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">{localError}</p>}
          <ImportResultDisplay result={result} errorsExpanded={errorsExpanded} setErrorsExpanded={setErrorsExpanded} />
        </div>
        <div className="flex justify-end gap-2 border-t border-border-default px-6 py-4">
          <button type="button" onClick={handleClose} className={`${BUTTON_SECONDARY} text-sm`}>Close</button>
          <button type="button" onClick={handleImport} disabled={!file || isPending} aria-label="Import CSV" className={`${BUTTON_PRIMARY} text-sm flex items-center gap-2`}>
            {isPending
              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              : <Upload className="h-4 w-4" aria-hidden="true" />}
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

export default CsvImportModal;
