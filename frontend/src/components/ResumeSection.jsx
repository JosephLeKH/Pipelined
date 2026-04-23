/** Resume upload and management section. */

import { useCallback, useState } from "react";

import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { CARD_BASE } from "../lib/designTokens";

const RESUME_ACCEPT = ".pdf";
const RESUME_MAX_MB = 2;

function ResumeSection({ hasResume, isUploading, isDeleting, onResumeUpload, onResumeDelete }) {
  const [resumeError, setResumeError] = useState(null);
  const [resumeSuccess, setResumeSuccess] = useState(false);

  const handleResumeUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeError(null);
    setResumeSuccess(false);
    if (file.size > RESUME_MAX_MB * 1024 * 1024) {
      setResumeError(`File must be ${RESUME_MAX_MB} MB or smaller.`);
      return;
    }
    onResumeUpload(file, {
      onSuccess: () => setResumeSuccess(true),
      onError: (err) => setResumeError(err?.message ?? "Upload failed. Please try again."),
    });
    // Reset input so the same file can be re-selected after removal
    e.target.value = "";
  }, [onResumeUpload]);

  const handleResumeDelete = useCallback(() => {
    setResumeError(null);
    setResumeSuccess(false);
    onResumeDelete(undefined, {
      onError: (err) => setResumeError(err?.message ?? "Failed to remove resume."),
    });
  }, [onResumeDelete]);

  return (
    <section className={`${CARD_BASE} p-6`}>
      <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
        Resume
      </h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Upload your resume (PDF, max {RESUME_MAX_MB} MB) to enable AI fit scoring on new applications.
      </p>
      {resumeSuccess && (
        <p role="alert" className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
          Resume uploaded successfully.
        </p>
      )}
      {resumeError && (
        <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{resumeError}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 rounded-button bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:ring-offset-2 active:scale-[0.98] transition-all duration-150">
          {isUploading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {hasResume ? "Replace resume" : "Upload resume"}
          <input
            type="file"
            accept={RESUME_ACCEPT}
            className="sr-only"
            onChange={handleResumeUpload}
            disabled={isUploading || isDeleting}
            aria-label="Upload resume PDF"
          />
        </label>
        {hasResume && (
          <button
            type="button"
            onClick={handleResumeDelete}
            disabled={isUploading || isDeleting}
            className="flex items-center gap-2 rounded-button border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Remove resume
          </button>
        )}
      </div>
      {hasResume && !resumeSuccess && (
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          A resume is currently on file. New applications will be scored automatically.
        </p>
      )}
    </section>
  );
}

export default ResumeSection;
