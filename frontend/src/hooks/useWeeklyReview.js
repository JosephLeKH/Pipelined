/** React Query hook for the current weekly pipeline review. */

import { useQuery } from "@tanstack/react-query";

import { fetchWeeklyReview } from "../api/review";

export const WEEKLY_REVIEW_KEYS = {
  current: ["review", "weekly"],
};

export function useWeeklyReview({ enabled = true } = {}) {
  return useQuery({
    queryKey: WEEKLY_REVIEW_KEYS.current,
    queryFn: fetchWeeklyReview,
    staleTime: 300_000,
    enabled,
  });
}
