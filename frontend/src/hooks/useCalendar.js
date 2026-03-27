/** React Query hooks for calendar event data. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createEvent, deleteEvent, fetchEvents, updateEvent } from "../api/calendar";
import { CALENDAR_STALE_TIME_MS } from "../lib/constants";

/** Centralized query key factory. */
export const CALENDAR_KEYS = {
  all: ["calendar"],
  events: () => [...CALENDAR_KEYS.all, "events"],
  eventsByMonth: (month, year) => [...CALENDAR_KEYS.events(), { month, year }],
  eventsByApplication: (applicationId) => [...CALENDAR_KEYS.events(), { applicationId }],
};

/** Build ISO date strings for the first and last day of a given month. */
function monthBounds(month, year) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { dateFrom: fmt(firstDay), dateTo: fmt(lastDay) };
}

/** Fetch calendar events for a specific month (1-indexed) and year. */
export function useCalendarEvents(month, year) {
  const { dateFrom, dateTo } = monthBounds(month, year);
  return useQuery({
    queryKey: CALENDAR_KEYS.eventsByMonth(month, year),
    queryFn: () => fetchEvents(dateFrom, dateTo),
    staleTime: CALENDAR_STALE_TIME_MS,
  });
}

/** Create a new calendar event. */
export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => createEvent(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_KEYS.all });
    },
  });
}

/** Update an existing calendar event. */
export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => updateEvent(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_KEYS.all });
    },
  });
}

/** Delete a calendar event. */
export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_KEYS.all });
    },
  });
}

/** Fetch all calendar events linked to a specific application. */
export function useApplicationEvents(applicationId) {
  return useQuery({
    queryKey: CALENDAR_KEYS.eventsByApplication(applicationId),
    queryFn: () => fetchEvents(null, null, applicationId),
    enabled: Boolean(applicationId),
    staleTime: CALENDAR_STALE_TIME_MS,
  });
}
