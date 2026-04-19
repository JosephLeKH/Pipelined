/** Hook for exporting/downloading application data. */

import { useState } from "react";

import { downloadPdfReport, exportApplicationsCsv } from "../api/applications";

const REPORT_FILENAME = "pipeline-report.pdf";
const CSV_FILENAME = "applications.csv";

/** Provides a handler for downloading the pipeline PDF report with loading/error/retryAfter state. */
export function useApplicationExport() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryAfter, setRetryAfter] = useState(null);

  const handleDownload = async () => {
    setIsLoading(true);
    setError(null);
    setRetryAfter(null);
    try {
      const { blob, retryAfter: after } = await downloadPdfReport();
      if (after !== null) {
        setRetryAfter(after);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = REPORT_FILENAME;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download report. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvExport = async (includeArchived = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const blob = await exportApplicationsCsv(includeArchived);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = CSV_FILENAME;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export CSV. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return { handleDownload, handleCsvExport, isLoading, error, retryAfter };
}
