/** React Query mutations for mission snooze and done actions. */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { completeMission, snoozeMission } from "../api/brief";
import { MORNING_BRIEF_KEYS } from "./useMorningBrief";

export function useMissionActions() {
  const queryClient = useQueryClient();

  const invalidateToday = () => {
    queryClient.invalidateQueries({ queryKey: MORNING_BRIEF_KEYS.today });
  };

  const snooze = useMutation({
    mutationFn: (missionId) => snoozeMission(missionId),
    onSuccess: invalidateToday,
  });

  const done = useMutation({
    mutationFn: (missionId) => completeMission(missionId),
    onSuccess: invalidateToday,
  });

  return { snooze, done };
}
