/** Displays a structured API error from React Query in a user-readable format. */

import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";

import { Button } from "./ui/button";

const FALLBACK_ERROR_MESSAGE = "An unexpected error occurred. Please try again.";

function extractMessage(error) {
  if (!error) return FALLBACK_ERROR_MESSAGE;
  if (typeof error.message === "string" && error.message) return error.message;
  return FALLBACK_ERROR_MESSAGE;
}

function ApiErrorMessage({ error, onRetry }) {
  const message = extractMessage(error);

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-8 text-center"
    >
      <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
      <p className="text-sm font-medium text-destructive">{message}</p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          Retry
        </Button>
      )}
    </div>
  );
}

export default ApiErrorMessage;
