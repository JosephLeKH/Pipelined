/** Step progress indicator for CSV import wizard. */

import Check from "lucide-react/dist/esm/icons/check";

import { CSV_IMPORT_STEPS } from "../lib/csvImport";
import { cn } from "../lib/utils";

export function CsvImportStepIndicator({ currentStep }) {
  return (
    <ol
      aria-label="Import progress"
      className="mb-4 flex flex-wrap items-center gap-2 border-b border-border-1 pb-4"
    >
      {CSV_IMPORT_STEPS.map((item, index) => {
        const isComplete = currentStep > index;
        const isCurrent = currentStep === index;
        return (
          <li key={item.id} className="flex items-center gap-2">
            {index > 0 && (
              <span className="hidden h-px w-4 bg-border-2 sm:block" aria-hidden="true" />
            )}
            <span
              className={cn(
                "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-xs font-medium",
                "motion-reduce:transition-none transition-colors duration-hover ease-out",
                isComplete && "bg-brand-600 text-white",
                isCurrent && "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
                !isComplete && !isCurrent && "bg-surface-1 text-text-3"
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              {isComplete ? <Check className="h-3 w-3" aria-hidden="true" /> : item.id}
            </span>
            <span
              className={cn(
                "text-xs",
                isCurrent ? "font-medium text-text-1" : "text-text-3"
              )}
            >
              {item.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
