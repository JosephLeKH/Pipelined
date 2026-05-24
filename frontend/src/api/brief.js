/** API functions for /api/brief. */

import { client } from "./client";

export async function fetchTodayBrief() {
  return client.get("/brief/today");
}

export async function fetchBriefHistory(days = 7) {
  return client.get(`/brief/history?days=${days}`);
}
