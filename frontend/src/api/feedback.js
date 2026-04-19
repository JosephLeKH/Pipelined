/** API functions for user feedback and NPS submission. */

import { client } from "./client";

export async function submitFeedback(payload) {
  return client.post("/feedback", payload);
}
