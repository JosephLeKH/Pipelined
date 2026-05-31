/** React hook for pipeline stage color overrides with server sync and localStorage fallback. */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";

import { updateStageColors } from "../api/userPrefs";
import { safeGet, safeSet } from "../lib/safeStorage";
import { useAuth } from "../context/AuthContext";
import { STAGE_COLOR_OVERRIDES_KEY, readStageColorOverrides } from "../lib/stageColorPrefs";

export function useStageColors() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const migrationUserIdRef = useRef(null);

  const queryKey = ["auth", "pipeline_stage_colors", user?.id];

  // Query: fetch from server, populate with localStorage cache if empty.
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch user prefs");
      const data = await response.json();
      const serverColors = data.data?.pipeline_stage_colors;

      // If server has nothing but localStorage has values, upload them.
      if (!serverColors) {
        const localColors = readStageColorOverrides();
        if (Object.keys(localColors).length > 0) {
          migrationUserIdRef.current = user?.id;
          try {
            await updateStageColors(localColors);
            return localColors;
          } catch {
            // Migration failed; fall back to localStorage.
            return localColors;
          }
        }
      }

      return serverColors || {};
    },
    staleTime: Infinity,
    retry: 1,
    enabled: !!user?.id,
  });

  // Mutation: update server and cache, sync to localStorage.
  const mutation = useMutation({
    mutationFn: updateStageColors,
    onMutate: async (newColors) => {
      // Rollback snapshot.
      const previous = queryClient.getQueryData(queryKey);

      // Optimistic update.
      const optimistic = { ...previous, ...newColors };
      queryClient.setQueryData(queryKey, optimistic);

      // Sync to localStorage.
      safeSet(STAGE_COLOR_OVERRIDES_KEY, JSON.stringify(optimistic));

      return previous;
    },
    onError: (err, newColors, previous) => {
      // Abort if user changed during the mutation (logout/login).
      if (migrationUserIdRef.current && migrationUserIdRef.current !== user?.id) {
        return;
      }
      // Rollback.
      queryClient.setQueryData(queryKey, previous);
      toast.error("Couldn't save preferences — reverted");
    },
  });

  return {
    colors: query.data || {},
    isLoading: query.isLoading,
    error: query.error || mutation.error,
    updateColors: mutation.mutate,
  };
}
