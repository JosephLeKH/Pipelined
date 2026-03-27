/** API functions for /api/calendar endpoints. */

import { client } from "./client";

/** Fetch calendar events within a date range. */
export async function fetchEvents(dateFrom, dateTo) {
  const params = new URLSearchParams();
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  const query = params.toString();
  return client.get(`/calendar/events${query ? `?${query}` : ""}`);
}

/** Create a new calendar event. */
export async function createEvent(body) {
  return client.post("/calendar/events", body);
}

/** Partially update a calendar event. */
export async function updateEvent(id, body) {
  return client.patch(`/calendar/events/${id}`, body);
}

/** Delete a calendar event. */
export async function deleteEvent(id) {
  return client.delete(`/calendar/events/${id}`);
}
