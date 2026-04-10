/** API functions for /api/saved-searches endpoints. */

import { client } from "./client";

/** Create a new saved search. */
export async function createSavedSearch(body) {
  return client.post("/saved-searches", body);
}

/** List all saved searches for the current user. */
export async function fetchSavedSearches() {
  return client.get("/saved-searches");
}

/** Delete a saved search by id. */
export async function deleteSavedSearch(id) {
  return client.delete(`/saved-searches/${id}`);
}

/** Fetch results for a saved search by id. */
export async function fetchSavedSearchResults(id) {
  return client.get(`/saved-searches/${id}/results`);
}
