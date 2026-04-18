/** React Query hooks for pipeline and timeline sharing. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createShare,
  createTimelineShare,
  getMyShare,
  getMyTimelineShare,
  getPublicPipeline,
  getPublicTimeline,
  revokeShare,
  revokeTimelineShare,
} from "../api/sharing";

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

const TIMELINE_SHARE_KEY = ["sharing", "timeline"];

export function useMyTimelineShare() {
  return useQuery({
    queryKey: TIMELINE_SHARE_KEY,
    queryFn: getMyTimelineShare,
    retry: false,
  });
}

export function useCreateTimelineShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTimelineShare,
    onSuccess: () => qc.invalidateQueries({ queryKey: TIMELINE_SHARE_KEY }),
  });
}

export function useRevokeTimelineShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: revokeTimelineShare,
    onSuccess: () => qc.invalidateQueries({ queryKey: TIMELINE_SHARE_KEY }),
  });
}

export function usePublicTimeline(slug) {
  return useQuery({
    queryKey: ["public", "timeline", slug],
    queryFn: () => getPublicTimeline(slug),
    enabled: Boolean(slug),
    retry: false,
  });
}
