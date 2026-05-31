/** Settings Resume & AI section — drag-and-drop upload zone. */

import { useCallback, useRef, useState } from "react";

import FileText from "lucide-react/dist/esm/icons/file-text";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import UploadCloud from "lucide-react/dist/esm/icons/upload-cloud";
import X from "lucide-react/dist/esm/icons/x";

import { useAuth } from "../context/AuthContext";
import { useDeleteResume, useUploadResume } from "../hooks/useAuth";
import { RESUME_ACCEPT, RESUME_MAX_MB } from "../lib/constants";
import { Button } from "./ui/button";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function useResumeUpload() {
  const { user } = useAuth();
  const { mutate: uploadResume, isPending: isUploading } = useUploadResume();
  const { mutate: deleteResume, isPending: isDeleting } = useDeleteResume();
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [resumeError, setResumeError] = useState(null);
  const [resumeSuccess, setResumeSuccess] = useState(false);

  const handleFile = useCallback((file) => {
    if (!file) return;
    setResumeError(null);
    setResumeSuccess(false);
    if (!file.name.endsWith(".pdf")) { setResumeError("Only PDF files are accepted."); return; }
    if (file.size > RESUME_MAX_MB * 1024 * 1024) { setResumeError(`File must be ${RESUME_MAX_MB} MB or smaller.`); return; }
    uploadResume(file, {
      onSuccess: () => { setUploadedFile({ name: file.name, size: file.size }); setResumeSuccess(true); },
      onError: (err) => setResumeError(err?.message ?? "Upload failed. Please try again."),
    });
  }, [uploadResume]);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setIsDragOver(false); handleFile(e.dataTransfer.files?.[0]);
  }, [handleFile]);

  const handleInputChange = useCallback((e) => {
    handleFile(e.target.files?.[0]); e.target.value = "";
  }, [handleFile]);

  const handleDelete = useCallback(() => {
    setResumeError(null); setResumeSuccess(false);
    deleteResume(undefined, {
      onSuccess: () => setUploadedFile(null),
      onError: (err) => setResumeError(err?.message ?? "Failed to remove resume."),
    });
  }, [deleteResume]);

  return { user, fileInputRef, isDragOver, setIsDragOver, isUploading, isDeleting, uploadedFile, resumeError, resumeSuccess, handleDrop, handleInputChange, handleDelete };
}

function ResumeFileCard({ uploadedFile, isDeleting, isUploading, onDelete }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border-1 bg-surface-1 px-4 py-3">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-brand-600 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-text-1">
            {uploadedFile?.name ?? "resume.pdf"}
          </p>
          {uploadedFile?.size && (
            <p className="text-xs text-text-3">{formatBytes(uploadedFile.size)}</p>
          )}
        </div>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={isDeleting || isUploading} aria-label="Remove resume" className="text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-950/30">
        {isDeleting
          ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          : <X className="h-4 w-4" aria-hidden="true" />}
        Remove
      </Button>
    </div>
  );
}

function ResumeDropZone({ isDragOver, setIsDragOver, isUploading, fileInputRef, onDrop, onInputChange }) {
  return (
    <>
      <div role="button" tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
          isDragOver
            ? "border-brand-600 bg-brand-50 dark:bg-brand-950/20"
            : "border-border-1 hover:border-brand-600"
        }`}
        aria-label="Upload resume: drag and drop or click to browse"
      >
        {isUploading
          ? <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-hidden="true" />
          : <UploadCloud className={`h-8 w-8 ${isDragOver ? "text-brand-600" : "text-text-3"}`} aria-hidden="true" />}
        <div>
          <p className="text-sm font-medium text-text-1">
            {isUploading ? "Uploading…" : "Drop your resume here or click to browse"}
          </p>
          <p className="mt-0.5 text-xs text-text-3">PDF only · max {RESUME_MAX_MB} MB</p>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept={RESUME_ACCEPT} className="sr-only"
        onChange={onInputChange} disabled={isUploading} aria-label="Upload resume PDF" />
    </>
  );
}

function SettingsResumeSection() {
  const { user, fileInputRef, isDragOver, setIsDragOver, isUploading, isDeleting,
          uploadedFile, resumeError, resumeSuccess, handleDrop, handleInputChange, handleDelete } = useResumeUpload();
  const hasResume = uploadedFile !== null || user?.has_resume;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg bg-surface-0 border border-border-1 p-6">
        <h2 className="mb-1 text-sm font-semibold text-text-1">Resume & AI</h2>
        <p className="mb-5 text-xs text-text-2">
          Upload your resume to enable AI fit scoring on new applications.
        </p>
        {resumeSuccess && (
          <p role="alert" className="mb-4 rounded-lg bg-brand-50 border border-brand-200 px-3 py-3 text-sm text-brand-900 dark:bg-brand-950/20 dark:border-brand-800 dark:text-brand-200">
            Resume uploaded successfully.
          </p>
        )}
        {resumeError && (
          <p role="alert" className="mb-4 text-sm text-brand-700">{resumeError}</p>
        )}
        {hasResume ? (
          <ResumeFileCard uploadedFile={uploadedFile} isDeleting={isDeleting} isUploading={isUploading} onDelete={handleDelete} />
        ) : (
          <ResumeDropZone isDragOver={isDragOver} setIsDragOver={setIsDragOver} isUploading={isUploading}
            fileInputRef={fileInputRef} onDrop={handleDrop} onInputChange={handleInputChange} />
        )}
      </div>
    </div>
  );
}

export default SettingsResumeSection;
