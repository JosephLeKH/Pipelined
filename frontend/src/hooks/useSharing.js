/** React Query hooks for pipeline sharing. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createShare, getMyShare, getPublicPipeline, revokeShare } from "../api/sharing";

const SHARE_KEY = ["sharing", "my"];

export function useMyShare() {
  return useQuery({
    queryKey: SHARE_KEY,
    queryFn: getMyShare,
    retry: false,
  });
}

export function useCreateShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createShare,
    onSuccess: () => qc.invalidateQueries({ queryKey: SHARE_KEY }),
  });
}

export function useRevokeShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: revokeShare,
    onSuccess: () => qc.invalidateQueries({ queryKey: SHARE_KEY }),
  });
}

export function usePublicPipeline(slug) {
  return useQuery({
    queryKey: ["public", "pipeline", slug],
    queryFn: () => getPublicPipeline(slug),
    enabled: Boolean(slug),
    retry: false,
  });
}
