/** Resume upload and management section. */

import { useCallback, useState } from "react";

import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { RESUME_ACCEPT, RESUME_MAX_MB } from "../lib/constants";
import { Button } from "./ui/button";

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
    <section className="rounded-xl bg-card border border-border p-6">
      <h2 className="mb-1 font-display text-base font-semibold text-foreground">
        Resume
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Upload your resume (PDF, max {RESUME_MAX_MB} MB) to enable AI fit scoring on new applications.
      </p>
      {resumeSuccess && (
        <p role="alert" className="mb-4 rounded-lg bg-primary/10 border border-primary/20 px-3 py-3 text-sm text-primary">
          Resume uploaded successfully.
        </p>
      )}
      {resumeError && (
        <p role="alert" className="mb-4 text-sm text-destructive">{resumeError}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild className="cursor-pointer focus-within:ring-offset-2">
          <label>
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
        </Button>
        {hasResume && (
          <Button
            type="button"
            variant="outline"
            onClick={handleResumeDelete}
            disabled={isUploading || isDeleting}
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Remove resume
          </Button>
        )}
      </div>
      {hasResume && !resumeSuccess && (
        <p className="mt-3 text-xs text-muted-foreground">
          A resume is currently on file. New applications will be scored automatically.
        </p>
      )}
    </section>
  );
}

export default ResumeSection;
