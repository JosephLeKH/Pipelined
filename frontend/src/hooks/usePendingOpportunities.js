/** React Query hooks for autopilot pending opportunities. */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  fetchPendingOpportunities,
  approvePendingOpportunity,
  dismissPendingOpportunity,
} from "../api/autopilot";
import { MORNING_BRIEF_KEYS } from "./useMorningBrief";

export const PENDING_KEYS = {
  all: ["autopilot", "pending"],
  list: ["autopilot", "pending", "list"],
};

export function usePendingOpportunities() {
  return useQuery({
    queryKey: PENDING_KEYS.list,
    queryFn: fetchPendingOpportunities,
    staleTime: 30_000,
  });
}

export function useApprovePendingOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (opportunityId) => approvePendingOpportunity(opportunityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: MORNING_BRIEF_KEYS.today });
    },
  });
}

export function useDismissPendingOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (opportunityId) => dismissPendingOpportunity(opportunityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_KEYS.all });
      queryClient.invalidateQueries({ queryKey: MORNING_BRIEF_KEYS.today });
    },
  });
}
