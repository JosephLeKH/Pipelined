/** API functions for /api/jobs endpoints. */

import { client } from "./client";

/**
 * Fetch a paginated, filtered list of job listings.
 * @param {Object} filters - Optional filter/pagination params.
 */
export async function fetchJobs(filters = {}) {
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
  return client.get(`/jobs${query ? `?${query}` : ""}`);
}

/** Fetch a single job listing by id. */
export async function fetchJob(id) {
  return client.get(`/jobs/${id}`);
}

/** Fetch personalized job recommendations for the authenticated user. */
export async function fetchRecommendedJobs() {
  return client.get("/jobs/recommended");
}
