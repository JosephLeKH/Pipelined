/** API functions for /api/brief. */

import { client } from "./client";

export async function fetchTodayBrief() {
  return client.get("/brief/today");
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
