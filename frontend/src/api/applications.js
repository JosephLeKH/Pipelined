/** API functions for /api/applications endpoints. */

import { client } from "./client";

/**
 * Fetch a paginated, filtered list of applications.
 * @param {Object} filters - Optional filter/sort/pagination params.
 */
export async function fetchApplications(filters = {}, { signal } = {}) {
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
  return client.get(`/applications${query ? `?${query}` : ""}`, { signal });
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

/** Restore bulk-deleted applications from undo stack. */
export async function undoBulkDelete(stackId) {
  return client.patch(`/applications/undo/${stackId}`);
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

/** Restore a soft-deleted application. */
export async function restoreApplication(id) {
  return client.post(`/applications/${id}/restore`);
}

/** Upload a CSV file to bulk-import applications. */
export async function importApplicationsCsv(file) {
  const form = new FormData();
  form.append("file", file);
  return client.post("/applications/import", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/** Merge source application into target. Returns updated target. */
export async function mergeApplications(body) {
  return client.post("/applications/merge", body);
}

/** Bulk-edit stage, follow_up_date, and/or tags for multiple applications. */
export async function bulkEditApplications(body) {
  return client.post("/applications/bulk-update", body);
}

/** Fetch per-stage funnel metrics for the current user. */
export async function fetchFunnel() {
  return client.get("/applications/funnel");
}

/** Fetch all tags used by the current user, sorted by count descending. */
export async function fetchTags() {
  return client.get("/applications/tags");
}

/** Generate a follow-up email draft for a stale application. */
export async function generateFollowUpDraft(appId) {
  const res = await client.post(`/applications/${appId}/follow-up-draft`);
  return res.data.data;
}

/** Rename a tag across all of the current user's applications. */
export async function renameTag({ oldTag, newTag }) {
  return client.patch("/applications/tags/rename", { old_tag: oldTag, new_tag: newTag });
}

/** Remove a tag from all of the current user's applications. */
export async function deleteTag(tag) {
  return client.delete(`/applications/tags/${encodeURIComponent(tag)}`);
}

/**
 * Download the pipeline PDF report as a Blob.
 * Returns { blob, retryAfter } where retryAfter is seconds (number | null).
 * Throws on non-200/429 errors.
 */
export async function downloadPdfReport() {
  const response = await fetch(`${EXPORT_BASE}/applications/report`, {
    credentials: "include",
  });
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After")) || null;
    return { blob: null, retryAfter };
  }
  if (!response.ok) throw new Error("Report download failed");
  const blob = await response.blob();
  return { blob, retryAfter: null };
}
