/** React Query hook for today's morning brief. */

import { useQuery } from "@tanstack/react-query";

import { fetchTodayBrief } from "../api/brief";

export const MORNING_BRIEF_KEYS = {
  today: ["brief", "today"],
};

export function useMorningBrief() {
  return useQuery({
    queryKey: MORNING_BRIEF_KEYS.today,
    queryFn: fetchTodayBrief,
    staleTime: 60_000,
  });
}
