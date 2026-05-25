/** Displays a structured API error from React Query in a user-readable format. */

const FALLBACK_ERROR_MESSAGE = "An unexpected error occurred. Please try again.";
const DEFAULT_TITLE = "Something went wrong";

function extractMessage(error) {
  if (!error) return FALLBACK_ERROR_MESSAGE;
  if (typeof error.message === "string" && error.message) return error.message;
  return FALLBACK_ERROR_MESSAGE;
}

function ApiErrorMessage({ error, title, detail, onRetry }) {
  const resolvedDetail = detail ?? extractMessage(error);
  const resolvedTitle = title ?? DEFAULT_TITLE;

  return (
    <div className="flex flex-col gap-2">
      <div
        role="alert"
        className="rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-900 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-100"
      >
        <span className="font-medium">{resolvedTitle}</span>
        <span className="text-brand-700 dark:text-brand-200"> · {resolvedDetail}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="self-start text-xs text-brand-600 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default ApiErrorMessage;
