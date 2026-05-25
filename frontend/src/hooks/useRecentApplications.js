/** Resolves recent application records from localStorage IDs and live application data. */

import { useMemo } from "react";

import { getRecentApplicationIds } from "../lib/recentApplications";

/** Returns up to five recently viewed applications with company and role metadata. */
export function useRecentApplications(applications) {
  return useMemo(() => {
    const ids = getRecentApplicationIds();
    if (!applications?.length || !ids.length) return [];
    const byId = new Map(applications.map((app) => [app.id, app]));
    return ids.map((id) => byId.get(id)).filter(Boolean).slice(0, 5);
  }, [applications]);
}
