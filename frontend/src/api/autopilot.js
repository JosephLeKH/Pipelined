/** API functions for /api/autopilot pending opportunities. */

import { client } from "./client";

export async function fetchPendingOpportunities() {
  return client.get("/autopilot/pending");
}

export async function approvePendingOpportunity(opportunityId) {
  return client.post(`/autopilot/pending/${opportunityId}/approve`);
}

export async function dismissPendingOpportunity(opportunityId) {
  return client.post(`/autopilot/pending/${opportunityId}/dismiss`);
}
