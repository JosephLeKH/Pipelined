/** Step 1 — drag-and-drop CSV upload zone. */

import { useCallback, useState } from "react";

import Upload from "lucide-react/dist/esm/icons/upload";

import { CSV_IMPORT_DROPZONE_HEIGHT_PX } from "../lib/csvImport";
import { cn } from "../lib/utils";

export function CsvImportDropZone({ fileRef, file, onFileSelect }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      setIsDragOver(false);
      const dropped = event.dataTransfer.files?.[0];
      if (dropped) onFileSelect(dropped);
    },
    [onFileSelect]
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-2">
        Upload a CSV with your applications. Required columns:{" "}
        <strong className="font-medium text-text-1">company</strong>,{" "}
        <strong className="font-medium text-text-1">role_title</strong>.
      </p>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 text-center",
          "motion-reduce:transition-none transition-[border-color,background-color] duration-hover ease-out",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2",
          "dark:focus-visible:outline-1",
          isDragOver
            ? "border-brand-600 bg-brand-50/40 dark:bg-brand-900/20"
            : "border-border-2 bg-surface-1 hover:border-border-3 hover:bg-surface-2"
        )}
        style={{ minHeight: `${CSV_IMPORT_DROPZONE_HEIGHT_PX}px` }}
      >
        <Upload className="h-5 w-5 text-text-3" aria-hidden="true" />
        <p className="text-sm font-medium text-text-1">
          {file ? file.name : "Drop CSV here or click to browse"}
        </p>
        <p className="text-xs text-text-3">CSV up to 2 MB</p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="text/csv,.csv"
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null;
          if (nextFile) onFileSelect(nextFile);
        }}
        aria-label="CSV file"
        className="sr-only"
      />
    </div>
  );
}
