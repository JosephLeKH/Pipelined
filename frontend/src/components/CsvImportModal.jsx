/** Modal for bulk-importing applications from a CSV file. */

import { useRef, useState } from "react";

import Upload from "lucide-react/dist/esm/icons/upload";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { useImportApplications } from "../hooks/useApplications";
import { trackEvent } from "../lib/analytics";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

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
    <div role="status" aria-live="polite" className="mb-4 rounded-lg bg-primary/10 border border-primary/20 px-3 py-3 text-sm text-foreground">
      <p><strong>{result.imported}</strong> imported, <strong>{result.skipped}</strong> skipped.</p>
      {result.warning && <p className="mt-1 text-xs">{result.warning}</p>}
      {result.errors?.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            {result.errors.length > ERRORS_COLLAPSE_THRESHOLD && (
              <Button type="button" variant="link" onClick={() => setErrorsExpanded((p) => !p)} className="h-auto p-0 text-xs text-destructive">
                {errorsExpanded ? "Hide errors" : `Show all ${result.errors.length} errors`}
              </Button>
            )}
            <Button type="button" variant="link" onClick={() => navigator.clipboard.writeText(result.errors.map((e) => `Row ${e.row}: ${e.reason}`).join("\n"))} className="h-auto p-0 text-xs text-muted-foreground">
              Copy errors
            </Button>
          </div>
          <ul className="mt-1 list-inside list-disc text-xs text-destructive">
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Import CSV</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Upload a CSV with the following columns (required: <strong>company</strong>,{" "}
            <strong>role_title</strong>):
          </p>
          <code className="mb-4 block overflow-x-auto whitespace-nowrap rounded bg-muted px-3 py-2 text-xs text-muted-foreground">
            {SAMPLE_HEADERS}
          </code>
          <input ref={fileRef} type="file" accept={ACCEPTED_MIME} onChange={handleFileChange} aria-label="CSV file" autoFocus
            className="mb-4 block w-full text-sm text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
          />
          {localError && <p role="alert" className="mb-3 text-sm text-destructive">{localError}</p>}
          <ImportResultDisplay result={result} errorsExpanded={errorsExpanded} setErrorsExpanded={setErrorsExpanded} />
        </div>
        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={handleClose}>Close</Button>
          <Button type="button" onClick={handleImport} disabled={!file || isPending} aria-busy={isPending} aria-label="Import CSV" className="flex items-center gap-2">
            {isPending
              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              : <Upload className="h-4 w-4" aria-hidden="true" />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CsvImportModal;
