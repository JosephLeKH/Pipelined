/** Submit and cancel button row for the ManualAddForm. */

import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "../lib/designTokens";

export function FormActions({ isPending, onCancel }) {
  return (
    <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
      <button type="button" onClick={onCancel} className={`${BUTTON_SECONDARY} text-sm`}>
        Cancel
      </button>
      <button type="submit" disabled={isPending} className={`${BUTTON_PRIMARY} text-sm flex items-center gap-2`}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Saving…
          </>
        ) : (
          "Add Application"
        )}
      </button>
    </div>
  );
}
