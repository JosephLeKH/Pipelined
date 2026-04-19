/** Hook: server-side + client-side application search for the command palette. */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchApplications } from "../api/applications";
import { KEYS } from "./useApplications";
import { QUERY_STALE_TIME_MS } from "../lib/constants";

export const PALETTE_CLIENT_LIMIT = 100;
const PALETTE_MAX_RESULTS = 10;
const EMPTY_APPS = Object.freeze([]);

/** Returns filtered application results for the palette search input. */
export function useCommandPaletteSearch({ query, debQuery, env }) {
  const allApps = env?.data ?? [];
  const total = env?.meta?.total ?? allApps.length;
  const searchEnabled = total > PALETTE_CLIENT_LIMIT && Boolean(debQuery);

  const { data: searchEnv } = useQuery({
    queryKey: KEYS.list({ q: debQuery, limit: PALETTE_MAX_RESULTS }),
    queryFn: () => fetchApplications({ q: debQuery, limit: PALETTE_MAX_RESULTS }),
    enabled: searchEnabled,
    staleTime: QUERY_STALE_TIME_MS,
  });

  return useMemo(() => {
    if (!query) return EMPTY_APPS;
    if (total <= PALETTE_CLIENT_LIMIT) {
      const q = query.toLowerCase();
      return allApps
        .filter((a) => a.company?.toLowerCase().includes(q) || a.role_title?.toLowerCase().includes(q))
        .slice(0, PALETTE_MAX_RESULTS);
    }
    return searchEnv?.data ?? [];
  }, [query, total, allApps, searchEnv]);
}
