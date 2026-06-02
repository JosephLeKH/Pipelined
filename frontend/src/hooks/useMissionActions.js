/** React Query mutations for mission snooze and done actions. */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { completeMission, snoozeMission } from "../api/brief";
import { MORNING_BRIEF_KEYS } from "./useMorningBrief";

function removeMissionLocally(queryClient, missionId) {
  const prev = queryClient.getQueryData(MORNING_BRIEF_KEYS.today);
  if (!prev?.missions) return prev;
  queryClient.setQueryData(MORNING_BRIEF_KEYS.today, {
    ...prev,
    missions: prev.missions.filter((m) => m.id !== missionId),
  });
  return prev;
}

export function useMissionActions() {
  const queryClient = useQueryClient();

  // Optimistically drop the mission from the cached brief so a focus-triggered
  // refetch during the in-flight mutation doesn't briefly reintroduce it.
  const optimisticOptions = {
    onMutate: async (missionId) => {
      await queryClient.cancelQueries({ queryKey: MORNING_BRIEF_KEYS.today });
      const previous = removeMissionLocally(queryClient, missionId);
      return { previous };
    },
    onError: (_err, _missionId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(MORNING_BRIEF_KEYS.today, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: MORNING_BRIEF_KEYS.today });
    },
  };

  const snooze = useMutation({
    mutationFn: (missionId) => snoozeMission(missionId),
    ...optimisticOptions,
  });

  const done = useMutation({
    mutationFn: (missionId) => completeMission(missionId),
    ...optimisticOptions,
  });

  return { snooze, done };
}
