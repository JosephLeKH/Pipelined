/** React Query hooks for saved searches. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createSavedSearch,
  deleteSavedSearch,
  fetchSavedSearches,
} from "../api/savedSearches";
import { QUERY_STALE_TIME_MS } from "../lib/constants";

export const SAVED_SEARCH_KEYS = {
  all: ["saved_searches"],
  list: () => [...SAVED_SEARCH_KEYS.all, "list"],
};

/** List all saved searches for the current user. */
export function useSavedSearches() {
  return useQuery({
    queryKey: SAVED_SEARCH_KEYS.list(),
    queryFn: fetchSavedSearches,
    staleTime: QUERY_STALE_TIME_MS,
  });
}

/** Create a new saved search. */
export function useCreateSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => createSavedSearch(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_SEARCH_KEYS.all });
    },
  });
}

/** Delete a saved search by id. */
export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteSavedSearch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_SEARCH_KEYS.all });
    },
  });
}
