/** API functions for /api/brief. */

import { client } from "./client";

export async function fetchTodayBrief() {
  const result = await client.get("/brief/today");
  // Backend returns {"data": null} when no brief exists yet. The global
  // response interceptor preserves the envelope in that case (null ?? body
  // falls through), so unwrap explicitly here.
  if (result && typeof result === "object" && result.data === null) return null;
  return result;
}

export async function generateTodayBrief() {
  return client.post("/brief/today/generate", {});
}

export async function fetchBriefHistory(days = 7) {
  return client.get(`/brief/history?days=${days}`);
}

export async function snoozeMission(missionId, body = {}) {
  return client.post(`/brief/missions/${encodeURIComponent(missionId)}/snooze`, body);
}

export async function completeMission(missionId) {
  return client.post(`/brief/missions/${encodeURIComponent(missionId)}/done`, {});
}
