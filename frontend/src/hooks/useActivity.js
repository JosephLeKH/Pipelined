/**
 * React Query hooks for the activity feed.
 * @module hooks/useActivity
 */

import { useQuery } from "@tanstack/react-query";
import { fetchActivityFeed } from "../api/activity";

export const ACTIVITY_KEYS = {
  all: ["activity"],
  feed: (days) => ["activity", "feed", days],
};

/**
 * @param {{ days?: number }} [opts]
 */
export function useActivityFeed({ days = 30 } = {}) {
  return useQuery({
    queryKey: ACTIVITY_KEYS.feed(days),
    queryFn: () => fetchActivityFeed({ days }),
  });
}
