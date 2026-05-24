/** React Query hook for agent activity feed. */

import { useQuery } from "@tanstack/react-query";

import { fetchAgentActivity } from "../api/agent";
import { QUERY_STALE_TIME_MS } from "../lib/constants";

export const AGENT_ACTIVITY_KEY = ["agent", "activity"];

export function useAgentActivity({ limit = 20, applicationId, enabled = true } = {}) {
  return useQuery({
    queryKey: [...AGENT_ACTIVITY_KEY, { limit, applicationId }],
    queryFn: () => fetchAgentActivity({ limit, applicationId }),
    staleTime: QUERY_STALE_TIME_MS,
    enabled,
  });
}
