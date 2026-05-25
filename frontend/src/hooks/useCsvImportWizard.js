/** Wizard state for the 4-step CSV import flow. */

import { useCallback, useRef, useState } from "react";

import { useImportApplications } from "./useApplications";
import { trackEvent } from "../lib/analytics";
import {
  CSV_IMPORT_MAX_BYTES,
  CSV_IMPORT_MAX_MB,
  guessColumnMapping,
  buildMappedCsvBlob,
  isMappingValid,
  readCsvFile,
} from "../lib/csvImport";

const STEP_UPLOAD = 0;
const STEP_MAP = 1;
const STEP_PREVIEW = 2;
const STEP_IMPORT = 3;

function resetWizardState(setters) {
  const {
    setStep,
    setFile,
    setParsed,
    setMapping,
    setResult,
    setLocalError,
    setErrorsExpanded,
  } = setters;
  setStep(STEP_UPLOAD);
  setFile(null);
  setParsed({ headers: [], rows: [] });
  setMapping({});
  setResult(null);
  setLocalError(null);
  setErrorsExpanded(false);
}

export function useCsvImportWizard(onClose) {
  const fileRef = useRef(null);
  const [step, setStep] = useState(STEP_UPLOAD);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState({ headers: [], rows: [] });
  const [mapping, setMapping] = useState({});
  const [result, setResult] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [errorsExpanded, setErrorsExpanded] = useState(false);
  const { mutateAsync, isPending } = useImportApplications();

  const setters = {
    setStep,
    setFile,
    setParsed,
    setMapping,
    setResult,
    setLocalError,
    setErrorsExpanded,
  };

  const loadFile = useCallback(async (nextFile) => {
    setResult(null);
    setLocalError(null);
    if (!nextFile) {
      setFile(null);
      setParsed({ headers: [], rows: [] });
      setMapping({});
      return;
    }
    if (nextFile.size > CSV_IMPORT_MAX_BYTES) {
      setLocalError(
        `${CSV_IMPORT_MAX_MB} MB max — this file is ${(nextFile.size / 1024 / 1024).toFixed(1)} MB.`
      );
      setFile(null);
      return;
    }
    try {
      const nextParsed = await readCsvFile(nextFile);
      if (nextParsed.headers.length === 0) {
        setLocalError("CSV file has no header row.");
        setFile(null);
        return;
      }
      setFile(nextFile);
      setParsed(nextParsed);
      setMapping(guessColumnMapping(nextParsed.headers));
    } catch {
      setLocalError("Could not read CSV file. Please try another file.");
      setFile(null);
    }
  }, []);

  const handleFileChange = useCallback(
    (event) => {
      const nextFile = event.target.files?.[0] ?? null;
      void loadFile(nextFile);
    },
    [loadFile]
  );

  const handleMappingChange = useCallback((fieldKey, sourceHeader) => {
    setMapping((prev) => ({ ...prev, [fieldKey]: sourceHeader === "__skip__" ? "" : sourceHeader }));
  }, []);

  const canAdvanceFromUpload = Boolean(file) && parsed.headers.length > 0;
  const canAdvanceFromMap = isMappingValid(mapping);

  const goNext = useCallback(() => {
    setLocalError(null);
    if (step === STEP_UPLOAD && canAdvanceFromUpload) setStep(STEP_MAP);
    else if (step === STEP_MAP && canAdvanceFromMap) setStep(STEP_PREVIEW);
    else if (step === STEP_PREVIEW) setStep(STEP_IMPORT);
  }, [step, canAdvanceFromUpload, canAdvanceFromMap]);

  const goBack = useCallback(() => {
    setLocalError(null);
    if (step === STEP_IMPORT) setStep(STEP_PREVIEW);
    else if (step === STEP_PREVIEW) setStep(STEP_MAP);
    else if (step === STEP_MAP) setStep(STEP_UPLOAD);
  }, [step]);

  const handleImport = useCallback(async () => {
    if (!file || !isMappingValid(mapping)) return;
    setLocalError(null);
    setResult(null);
    try {
      const blob = buildMappedCsvBlob(parsed, mapping);
      const mappedFile = new File([blob], file.name, { type: "text/csv" });
      const res = await mutateAsync(mappedFile);
      const resultData = res?.data ?? res;
      setResult(resultData);
      trackEvent("csv_imported", {
        count: resultData?.imported ?? 0,
        skipped: resultData?.skipped ?? 0,
      });
      setErrorsExpanded(false);
    } catch (err) {
      setLocalError(err?.message ?? "Import failed. Please try again.");
    }
  }, [file, mapping, parsed, mutateAsync]);

  const handleClose = useCallback(() => {
    resetWizardState(setters);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  }, [onClose]);

  return {
    fileRef,
    step,
    file,
    parsed,
    mapping,
    result,
    localError,
    errorsExpanded,
    setErrorsExpanded,
    isPending,
    canAdvanceFromUpload,
    canAdvanceFromMap,
    loadFile,
    handleFileChange,
    handleMappingChange,
    goNext,
    goBack,
    handleImport,
    handleClose,
  };
}
