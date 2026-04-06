/** API functions for /api/applications endpoints. */

import { client } from "./client";

/**
 * Fetch a paginated, filtered list of applications.
 * @param {Object} filters - Optional filter/sort/pagination params.
 */
export async function fetchApplications(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return client.get(`/applications${query ? `?${query}` : ""}`);
}

/** Fetch a single application by id. */
export async function fetchApplication(id) {
  return client.get(`/applications/${id}`);
}

/** Create a new application. */
export async function createApplication(body) {
  return client.post("/applications", body);
}

/** Partially update an application. */
export async function updateApplication(id, body) {
  return client.patch(`/applications/${id}`, body);
}

/** Delete an application. */
export async function deleteApplication(id) {
  return client.delete(`/applications/${id}`);
}

/** Archive an application (soft delete). */
export async function archiveApplication(id) {
  return client.patch(`/applications/${id}/archive`);
}

/** Restore an archived application. */
export async function unarchiveApplication(id) {
  return client.patch(`/applications/${id}/unarchive`);
}

/** Fetch aggregated stats for the current user's pipeline. */
export async function fetchStats() {
  return client.get("/applications/stats");
}

const EXPORT_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

/** Bulk delete multiple applications by id. */
export async function bulkDeleteApplications(ids) {
  return client.delete("/applications/bulk", { data: { ids } });
}

/** Bulk update stage for multiple applications. */
export async function bulkUpdateApplicationStage(ids, stage) {
  return client.patch("/applications/bulk-stage", { ids, stage });
}

/** Download all applications as a CSV blob. Uses native fetch to avoid JSON interceptor. */
export async function exportApplicationsCsv(includeArchived = false) {
  const params = includeArchived ? "?include_archived=true" : "";
  const response = await fetch(`${EXPORT_BASE}/applications/export${params}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Export failed");
  return response.blob();
}

/** Fetch analytics data for the current user. */
export async function fetchAnalytics(days = null) {
  const params = days != null ? `?days=${days}` : "";
  return client.get(`/applications/analytics${params}`);
}
