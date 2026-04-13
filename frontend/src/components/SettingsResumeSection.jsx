/** Settings Resume & AI section — drag-and-drop upload zone and AI fit score usage meter. */

import { useCallback, useRef, useState } from "react";

import FileText from "lucide-react/dist/esm/icons/file-text";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import UploadCloud from "lucide-react/dist/esm/icons/upload-cloud";
import X from "lucide-react/dist/esm/icons/x";

import { useAuth } from "../context/AuthContext";
import { useDeleteResume, useUploadResume } from "../hooks/useAuth";

const RESUME_ACCEPT = ".pdf";
const RESUME_MAX_MB = 2;
const AI_SCORE_LIMIT = 10;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SettingsResumeSection() {
  const { user } = useAuth();
  const { mutate: uploadResume, isPending: isUploading } = useUploadResume();
  const { mutate: deleteResume, isPending: isDeleting } = useDeleteResume();

  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [resumeError, setResumeError] = useState(null);
  const [resumeSuccess, setResumeSuccess] = useState(false);

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      setResumeError(null);
      setResumeSuccess(false);
      if (!file.name.endsWith(".pdf")) {
        setResumeError("Only PDF files are accepted.");
        return;
      }
      if (file.size > RESUME_MAX_MB * 1024 * 1024) {
        setResumeError(`File must be ${RESUME_MAX_MB} MB or smaller.`);
        return;
      }
      uploadResume(file, {
        onSuccess: () => {
          setUploadedFile({ name: file.name, size: file.size });
          setResumeSuccess(true);
        },
        onError: (err) => setResumeError(err?.message ?? "Upload failed. Please try again."),
      });
    },
    [uploadResume]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e) => {
      handleFile(e.target.files?.[0]);
      e.target.value = "";
    },
    [handleFile]
  );

  const handleDelete = useCallback(() => {
    setResumeError(null);
    setResumeSuccess(false);
    deleteResume(undefined, {
      onSuccess: () => setUploadedFile(null),
      onError: (err) => setResumeError(err?.message ?? "Failed to remove resume."),
    });
  }, [deleteResume]);

  const hasResume = uploadedFile !== null || user?.has_resume;
  const aiScores = user?.ai_scores_today ?? 0;
  const aiPct = Math.min(100, Math.round((aiScores / AI_SCORE_LIMIT) * 100));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Resume & AI
        </h2>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          Upload your resume to enable AI fit scoring on new applications.
        </p>

        {resumeSuccess && (
          <p role="alert" className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
            Resume uploaded successfully.
          </p>
        )}
        {resumeError && (
          <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{resumeError}</p>
        )}

        {hasResume ? (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-brand-500 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {uploadedFile?.name ?? "resume.pdf"}
                </p>
                {uploadedFile?.size && (
                  <p className="text-xs text-slate-400">{formatBytes(uploadedFile.size)}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isUploading}
              aria-label="Remove resume"
              className="flex items-center gap-1.5 rounded-button px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-rose-400 dark:hover:bg-rose-900/30"
            >
              {isDeleting
                ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <X className="h-4 w-4" aria-hidden="true" />}
              Remove
            </button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 ${
              isDragOver
                ? "border-brand-500 bg-brand-50 dark:bg-brand-900/10"
                : "border-slate-300 hover:border-brand-500 dark:border-slate-600 dark:hover:border-brand-400"
            }`}
            aria-label="Upload resume — drag and drop or click to browse"
          >
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" aria-hidden="true" />
            ) : (
              <UploadCloud className={`h-8 w-8 ${isDragOver ? "text-brand-500" : "text-slate-400"}`} aria-hidden="true" />
            )}
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {isUploading ? "Uploading…" : "Drop your resume here or click to browse"}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">PDF only · max {RESUME_MAX_MB} MB</p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={RESUME_ACCEPT}
          className="sr-only"
          onChange={handleInputChange}
          disabled={isUploading || isDeleting}
          aria-label="Upload resume PDF"
        />
      </div>

      <div className="rounded-card border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-100">
          AI fit scoring
        </h3>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Daily usage resets at midnight UTC.</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Fit scores used today</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {aiScores} / {AI_SCORE_LIMIT}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${aiPct}%` }}
              role="progressbar"
              aria-valuenow={aiScores}
              aria-valuemin={0}
              aria-valuemax={AI_SCORE_LIMIT}
              aria-label="AI fit scores used today"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsResumeSection;
