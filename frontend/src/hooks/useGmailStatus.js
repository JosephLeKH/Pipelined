/** React Query hooks for Gmail integration. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  disconnectGmail,
  fetchGmailStatus,
  triggerGmailSync,
  updateGmailSettings,
} from "../api/email";

export const GMAIL_STATUS_KEY = ["gmail", "status"];

/** Fetch the current Gmail connection status. */
export function useGmailStatus() {
  return useQuery({
    queryKey: GMAIL_STATUS_KEY,
    queryFn: fetchGmailStatus,
    staleTime: 30_000,
  });
}

/** Mutate Gmail automation settings. */
export function useGmailSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateGmailSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: GMAIL_STATUS_KEY }),
  });
}

/** Trigger a manual sync. */
export function useGmailSyncMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: triggerGmailSync,
    onSuccess: () => qc.invalidateQueries({ queryKey: GMAIL_STATUS_KEY }),
  });
}

/** Disconnect Gmail. */
export function useGmailDisconnectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: disconnectGmail,
    onSuccess: () => qc.invalidateQueries({ queryKey: GMAIL_STATUS_KEY }),
  });
}
