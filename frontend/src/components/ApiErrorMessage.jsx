/** Displays a structured API error from React Query in a user-readable format. */

import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";

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
      className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center"
    >
      <AlertCircle className="h-6 w-6 text-red-500" aria-hidden="true" />
      <p className="text-sm font-medium text-red-800">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default ApiErrorMessage;
