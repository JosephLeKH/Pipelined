/** Import result summary with optional error list. */

import { Button } from "./ui/button";

const ERRORS_COLLAPSE_THRESHOLD = 5;

export function CsvImportResultDisplay({ result, errorsExpanded, setErrorsExpanded }) {
  if (!result) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-3 text-sm text-brand-900 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-100"
    >
      <p>
        <strong>{result.imported}</strong> imported, <strong>{result.skipped}</strong> skipped.
      </p>
      {result.warning && <p className="mt-1 text-xs">{result.warning}</p>}
      {result.errors?.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            {result.errors.length > ERRORS_COLLAPSE_THRESHOLD && (
              <Button
                type="button"
                variant="link"
                onClick={() => setErrorsExpanded((prev) => !prev)}
                className="h-auto p-0 text-xs text-brand-700"
              >
                {errorsExpanded
                  ? "Hide errors"
                  : `Show all ${result.errors.length} errors`}
              </Button>
            )}
            <Button
              type="button"
              variant="link"
              onClick={() =>
                navigator.clipboard.writeText(
                  result.errors.map((entry) => `Row ${entry.row}: ${entry.reason}`).join("\n")
                )
              }
              className="h-auto p-0 text-xs text-text-3"
            >
              Copy errors
            </Button>
          </div>
          <ul className="mt-1 list-inside list-disc text-xs text-brand-700">
            {(errorsExpanded || result.errors.length <= ERRORS_COLLAPSE_THRESHOLD
              ? result.errors
              : result.errors.slice(0, ERRORS_COLLAPSE_THRESHOLD)
            ).map((entry) => (
              <li key={entry.row}>
                Row {entry.row}: {entry.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
