/** API functions for /api/brief. */

import { client } from "./client";

export async function fetchTodayBrief() {
  return client.get("/brief/today");
}
