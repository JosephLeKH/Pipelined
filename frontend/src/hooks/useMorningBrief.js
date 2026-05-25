/** React Query hook for today's morning brief. */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchTodayBrief, generateTodayBrief } from "../api/brief";

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

export function useGenerateBrief() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateTodayBrief,
    onSuccess: (brief) => {
      queryClient.setQueryData(MORNING_BRIEF_KEYS.today, brief);
      toast.success("Morning brief refreshed");
    },
    onError: (err) => {
      const message =
        err?.response?.data?.detail?.message ??
        err?.message ??
        "Could not refresh the brief. Try again in a bit.";
      toast.error(message);
    },
  });
}
