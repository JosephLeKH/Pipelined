/** React hook for appearance preferences with server sync and localStorage fallback. */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";

import { updateAppearancePrefs } from "../api/userPrefs";
import { safeGet, safeSet } from "../lib/safeStorage";
import { useAuth } from "../context/AuthContext";
import {
  DENSITY_KEY,
  FONT_SIZE_KEY,
  ACCENT_KEY,
  readDensity,
  readFontSizeIndex,
  readAccent,
} from "../lib/appearancePrefs";

export function useAppearancePrefs() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const migrationUserIdRef = useRef(null);

  const queryKey = ["auth", "appearance_prefs", user?.id];

  // Query: fetch from server, populate with localStorage cache if empty.
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch user prefs");
      const data = await response.json();
      const serverPrefs = data.data?.appearance_prefs;

      // If server has nothing but localStorage has values, upload them.
      if (!serverPrefs) {
        const localPrefs = {
          theme: null,
          density: readDensity(),
          font_size: readFontSizeIndex(),
          accent_color: readAccent(),
        };
        // Trigger migration if any localStorage values exist.
        if (localPrefs.density || localPrefs.font_size || localPrefs.accent_color) {
          migrationUserIdRef.current = user?.id;
          try {
            await updateAppearancePrefs(localPrefs);
            return localPrefs;
          } catch {
            // Migration failed; fall back to localStorage.
            return localPrefs;
          }
        }
      }

      return serverPrefs || {};
    },
    staleTime: Infinity,
    retry: 1,
    enabled: !!user?.id,
  });

  // Mutation: update server and cache, sync to localStorage.
  const mutation = useMutation({
    mutationFn: updateAppearancePrefs,
    onMutate: async (newPrefs) => {
      // Rollback snapshot.
      const previous = queryClient.getQueryData(queryKey);

      // Optimistic update.
      const optimistic = { ...previous, ...newPrefs };
      queryClient.setQueryData(queryKey, optimistic);

      // Sync to localStorage.
      if (newPrefs.density !== undefined) safeSet(DENSITY_KEY, newPrefs.density);
      if (newPrefs.font_size !== undefined) safeSet(FONT_SIZE_KEY, String(newPrefs.font_size));
      if (newPrefs.accent_color !== undefined) safeSet(ACCENT_KEY, newPrefs.accent_color);

      return previous;
    },
    onError: (err, newPrefs, previous) => {
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
    prefs: query.data || {},
    isLoading: query.isLoading,
    error: query.error || mutation.error,
    updatePrefs: mutation.mutate,
  };
}
