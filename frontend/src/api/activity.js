/**
 * Activity feed API client.
 * @module api/activity
 */

import { client } from "./client";

/**
 * @param {{ days?: number }} [opts]
 * @returns {Promise<Array<object>>}
 */
export async function fetchActivityFeed({ days = 30 } = {}) {
  return client.get("/activity", { params: { days } });
}
