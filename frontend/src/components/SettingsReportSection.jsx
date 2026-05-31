/** Settings reports section — download pipeline PDF report. */

import Download from "lucide-react/dist/esm/icons/download";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { useApplicationExport } from "../hooks/useApplicationExport";
import { Button } from "./ui/button";

export default function SettingsReportSection() {
  const { handleDownload, isLoading, error, retryAfter } = useApplicationExport();

  return (
    <div className="rounded-lg bg-surface-0 border border-border-1 p-6">
      <h2 className="mb-1 text-sm font-semibold text-text-1">Reports</h2>
      <p className="mb-5 text-xs text-text-2">
        Export a PDF summary of your pipeline including stats, stage funnel, and application history.
      </p>

      <Button
        type="button"
        onClick={handleDownload}
        disabled={isLoading}
        aria-busy={isLoading}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
        {isLoading ? "Generating…" : "Download Pipeline Report"}
      </Button>

      {retryAfter !== null && (
        <p role="alert" className="mt-4 text-sm text-status-warn">
          Rate limit reached. Please wait {retryAfter} second{retryAfter !== 1 ? "s" : ""} before trying again.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-brand-700">
          {error}
        </p>
      )}
    </div>
  );
}
