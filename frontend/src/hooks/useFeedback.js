/** Hook for submitting user feedback and NPS responses. */

import { useMutation } from "@tanstack/react-query";

import { submitFeedback } from "../api/feedback";

/** Wraps feedback submission in a React Query mutation. Returns { submit, isPending }. */
export function useFeedback() {
  const mutation = useMutation({ mutationFn: submitFeedback });
  return { submit: mutation.mutateAsync, isPending: mutation.isPending };
}
