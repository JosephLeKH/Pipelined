/** API functions for /api/contacts endpoints. */

import { client } from "./client";

/** List contacts with optional filters. */
export async function fetchContacts({ company, relationship, applicationId } = {}) {
  const params = new URLSearchParams();
  if (company) params.set("company", company);
  if (relationship) params.set("relationship", relationship);
  if (applicationId) params.set("application_id", applicationId);
  const query = params.toString();
  return client.get(`/contacts${query ? `?${query}` : ""}`);
}

/** Fetch a single contact by ID. */
export async function fetchContact(id) {
  return client.get(`/contacts/${id}`);
}

/** Create a new contact. */
export async function createContact(body) {
  return client.post("/contacts", body);
}

/** Partially update a contact. */
export async function updateContact(id, body) {
  return client.patch(`/contacts/${id}`, body);
}

/** Delete a contact. */
export async function deleteContact(id) {
  return client.delete(`/contacts/${id}`);
}

/** Link a contact to an application. */
export async function linkContactToApplication(contactId, applicationId) {
  return client.patch(`/contacts/${contactId}/link`, { application_id: applicationId });
}

/** Unlink a contact from an application. */
export async function unlinkContactFromApplication(contactId, applicationId) {
  return client.patch(`/contacts/${contactId}/unlink`, { application_id: applicationId });
}

/** Fetch a relationship type suggestion based on application context or email. */
export async function fetchRelationshipSuggestion({ applicationId, email } = {}) {
  const params = new URLSearchParams();
  if (applicationId) params.set("application_id", applicationId);
  if (email) params.set("email", email);
  return client.get(`/contacts/suggest-type?${params.toString()}`);
}
