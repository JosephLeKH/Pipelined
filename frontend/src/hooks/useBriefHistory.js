/** React Query hook for morning brief history. */

import { useQuery } from "@tanstack/react-query";

import { fetchBriefHistory } from "../api/brief";

export const BRIEF_HISTORY_KEYS = {
  list: (days) => ["brief", "history", days],
};

export function useBriefHistory(days = 7) {
  return useQuery({
    queryKey: BRIEF_HISTORY_KEYS.list(days),
    queryFn: () => fetchBriefHistory(days),
    staleTime: 60_000,
  });
}
