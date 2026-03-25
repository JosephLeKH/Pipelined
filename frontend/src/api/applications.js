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

/** Fetch aggregated stats for the current user's pipeline. */
export async function fetchStats() {
  return client.get("/applications/stats");
}
