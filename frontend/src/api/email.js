/** API functions for /api/email endpoints. */

import { client } from "./client";

/** Return the Gmail OAuth authorization URL for the current user. */
export async function fetchGmailAuthUrl(emailHint = "") {
  const params = emailHint ? `?email_hint=${encodeURIComponent(emailHint)}` : "";
  return client.get(`/email/auth${params}`);
}

/** Return the current Gmail connection status. */
export async function fetchGmailStatus() {
  return client.get("/email/status");
}

/** Trigger a manual Gmail sync. */
export async function triggerGmailSync() {
  return client.post("/email/sync");
}

/** Update Gmail automation settings. */
export async function updateGmailSettings(patch) {
  return client.patch("/email/settings", patch);
}

/** Disconnect the Gmail inbox. */
export async function disconnectGmail() {
  return client.delete("/email/disconnect");
}
