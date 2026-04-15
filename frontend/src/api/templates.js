/** API functions for /api/templates endpoints. */

import { client } from "./client";

/** List all templates for the current user. */
export async function fetchTemplates() {
  return client.get("/templates/");
}

/** Create a new application template. */
export async function createTemplate(body) {
  return client.post("/templates/", body);
}

/** Partially update a template (rename or update fields). */
export async function updateTemplate(id, body) {
  return client.patch(`/templates/${id}`, body);
}

/** Delete a template by ID. */
export async function deleteTemplate(id) {
  return client.delete(`/templates/${id}`);
}
