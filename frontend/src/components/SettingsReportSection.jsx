/** Settings reports section — download pipeline PDF report. */

import Download from "lucide-react/dist/esm/icons/download";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { useApplicationExport } from "../hooks/useApplicationExport";

export default function SettingsReportSection() {
  const { handleDownload, isLoading, error, retryAfter } = useApplicationExport();

  return (
    <div className="rounded-card border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">Reports</h2>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        Export a PDF summary of your pipeline including stats, stage funnel, and application history.
      </p>

      <button
        type="button"
        onClick={handleDownload}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-button bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
        {isLoading ? "Generating…" : "Download Pipeline Report"}
      </button>

      {retryAfter !== null && (
        <p role="alert" className="mt-4 text-sm text-amber-600 dark:text-amber-400">
          Rate limit reached. Please wait {retryAfter} second{retryAfter !== 1 ? "s" : ""} before trying again.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
