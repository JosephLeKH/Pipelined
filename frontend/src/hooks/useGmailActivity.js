/** React Query hook for Gmail classification activity feed. */

import { useQuery } from "@tanstack/react-query";

import { fetchGmailActivity } from "../api/email";
import { useAuth } from "../context/AuthContext";
import { GMAIL_STATUS_KEY } from "./useGmailStatus";

export const GMAIL_ACTIVITY_KEY = [...GMAIL_STATUS_KEY, "activity"];

/** Fetch recent Gmail classification events (privacy-safe, no email bodies). */
export function useGmailActivity({ enabled = true } = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: GMAIL_ACTIVITY_KEY,
    queryFn: fetchGmailActivity,
    staleTime: 30_000,
    enabled: Boolean(user) && enabled,
  });
}
