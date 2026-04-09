/**
 * Activity feed API client.
 * @module api/activity
 */

import axios from "axios";

/**
 * @param {{ days?: number }} [opts]
 * @returns {Promise<{ data: Array<object>, meta: { total: number, days: number } }>}
 */
export async function fetchActivityFeed({ days = 30 } = {}) {
  const res = await axios.get("/api/activity", { params: { days } });
  return res.data;
}
