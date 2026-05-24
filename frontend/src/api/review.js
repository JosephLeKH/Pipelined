/** API functions for /api/review. */

import { client } from "./client";

export async function fetchWeeklyReview() {
  return client.get("/review/weekly");
}
