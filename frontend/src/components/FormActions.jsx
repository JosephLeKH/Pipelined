/** Submit and cancel button row for the ManualAddForm. */

import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { Button } from "./ui/button";

export function FormActions({ isPending, onCancel }) {
  return (
    <div className="flex justify-end gap-3 border-t border-border pt-4">
      <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
      <Button type="submit" size="sm" disabled={isPending} aria-busy={isPending} className="flex items-center gap-2">
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Saving…
          </>
        ) : (
          "Add Application"
        )}
      </Button>
    </div>
  );
}
