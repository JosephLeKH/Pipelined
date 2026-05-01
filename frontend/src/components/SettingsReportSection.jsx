/** Settings reports section — download pipeline PDF report. */

import Download from "lucide-react/dist/esm/icons/download";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { useApplicationExport } from "../hooks/useApplicationExport";
import { Button } from "./ui/button";

export default function SettingsReportSection() {
  const { handleDownload, isLoading, error, retryAfter } = useApplicationExport();

  return (
    <div className="rounded-xl bg-card border border-border p-6">
      <h2 className="mb-1 font-display text-lg font-semibold text-foreground">Reports</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Export a PDF summary of your pipeline including stats, stage funnel, and application history.
      </p>

      <Button
        type="button"
        onClick={handleDownload}
        disabled={isLoading}
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
        <p role="alert" className="mt-4 text-sm text-amber-600 dark:text-amber-400">
          Rate limit reached. Please wait {retryAfter} second{retryAfter !== 1 ? "s" : ""} before trying again.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
