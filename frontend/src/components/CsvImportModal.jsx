/** 4-step modal for bulk-importing applications from a CSV file. */

import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Upload from "lucide-react/dist/esm/icons/upload";

import { useCsvImportWizard } from "../hooks/useCsvImportWizard";
import { MANUAL_ADD_FORM_WIDTH_PX } from "../lib/constants";
import { CsvImportDropZone } from "./CsvImportDropZone";
import { CsvImportMappingTable } from "./CsvImportMappingTable";
import { CsvImportPreviewTable } from "./CsvImportPreviewTable";
import { CsvImportResultDisplay } from "./CsvImportResultDisplay";
import { CsvImportStepIndicator } from "./CsvImportStepIndicator";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

function CsvImportStepBody({ step, wizard }) {
  if (step === 0) {
    return (
      <CsvImportDropZone
        fileRef={wizard.fileRef}
        file={wizard.file}
        onFileSelect={wizard.loadFile}
      />
    );
  }
  if (step === 1) {
    return (
      <CsvImportMappingTable
        headers={wizard.parsed.headers}
        mapping={wizard.mapping}
        onMappingChange={wizard.handleMappingChange}
      />
    );
  }
  if (step === 2) {
    return (
      <CsvImportPreviewTable parsed={wizard.parsed} mapping={wizard.mapping} />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-2">
        Ready to import <strong className="text-text-1">{wizard.parsed.rows.length}</strong>{" "}
        rows from <strong className="text-text-1">{wizard.file?.name}</strong>.
      </p>
      {wizard.isPending && (
        <div
          role="progressbar"
          aria-label="Import in progress"
          aria-busy="true"
          className="h-1 w-full overflow-hidden rounded-full bg-surface-2"
        >
          <div className="h-full w-full animate-pulse bg-brand-600 motion-reduce:animate-none" />
        </div>
      )}
      <CsvImportResultDisplay
        result={wizard.result}
        errorsExpanded={wizard.errorsExpanded}
        setErrorsExpanded={wizard.setErrorsExpanded}
      />
    </div>
  );
}

function CsvImportModalFooter({ step, wizard }) {
  const showBack = step > 0 && !wizard.result;
  const isLastStep = step === 3;

  return (
    <DialogFooter className="border-t border-border-1 px-6 py-4">
      <Button type="button" variant="ghost" size="sm" onClick={wizard.handleClose}>
        Close
      </Button>
      {showBack && (
        <Button type="button" variant="secondary" size="sm" onClick={wizard.goBack}>
          Back
        </Button>
      )}
      {!isLastStep && (
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={wizard.goNext}
          disabled={
            (step === 0 && !wizard.canAdvanceFromUpload) ||
            (step === 1 && !wizard.canAdvanceFromMap)
          }
        >
          Next
        </Button>
      )}
      {isLastStep && !wizard.result && (
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={wizard.handleImport}
          disabled={!wizard.file || wizard.isPending || !wizard.canAdvanceFromMap}
          aria-busy={wizard.isPending}
          className="flex items-center gap-2"
        >
          {wizard.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" aria-hidden="true" />
          )}
          Import
        </Button>
      )}
    </DialogFooter>
  );
}

function CsvImportModal({ isOpen, onClose }) {
  const wizard = useCsvImportWizard(onClose);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) wizard.handleClose();
      }}
    >
      <DialogContent
        className="gap-0 p-0"
        style={{ maxWidth: `${MANUAL_ADD_FORM_WIDTH_PX}px` }}
      >
        <DialogHeader className="border-b border-border-1 px-6 py-4">
          <DialogTitle>Import CSV</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4">
          <CsvImportStepIndicator currentStep={wizard.step} />
          {wizard.localError && (
            <p role="alert" className="mb-3 text-sm text-brand-700">
              {wizard.localError}
            </p>
          )}
          <CsvImportStepBody step={wizard.step} wizard={wizard} />
        </div>
        <CsvImportModalFooter step={wizard.step} wizard={wizard} />
      </DialogContent>
    </Dialog>
  );
}

export default CsvImportModal;
