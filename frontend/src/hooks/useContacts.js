/** React Query hooks for contacts data. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createContact,
  deleteContact,
  fetchContact,
  fetchContacts,
  linkContactToApplication,
  unlinkContactFromApplication,
  updateContact,
} from "../api/contacts";

/** Centralized query key factory. */
export const CONTACT_KEYS = {
  all: ["contacts"],
  lists: () => [...CONTACT_KEYS.all, "list"],
  list: (filters) => [...CONTACT_KEYS.lists(), filters],
  details: () => [...CONTACT_KEYS.all, "detail"],
  detail: (id) => [...CONTACT_KEYS.details(), id],
  byApplication: (applicationId) => [...CONTACT_KEYS.lists(), { applicationId }],
};

/** List contacts with optional filters. */
export function useContacts(filters = {}) {
  return useQuery({
    queryKey: CONTACT_KEYS.list(filters),
    queryFn: () => fetchContacts(filters),
  });
}

/** List contacts linked to a specific application. */
export function useApplicationContacts(applicationId) {
  return useQuery({
    queryKey: CONTACT_KEYS.byApplication(applicationId),
    queryFn: () => fetchContacts({ applicationId }),
    enabled: Boolean(applicationId),
  });
}

/** Fetch a single contact. */
export function useContact(id) {
  return useQuery({
    queryKey: CONTACT_KEYS.detail(id),
    queryFn: () => fetchContact(id),
    enabled: Boolean(id),
  });
}

/** Create a new contact. */
export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => createContact(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACT_KEYS.all });
    },
  });
}

/** Update a contact. */
export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => updateContact(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACT_KEYS.all });
    },
  });
}

/** Delete a contact. */
export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACT_KEYS.all });
    },
  });
}

/** Link a contact to an application. */
export function useLinkContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, applicationId }) => linkContactToApplication(contactId, applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACT_KEYS.all });
    },
  });
}

/** Unlink a contact from an application. */
export function useUnlinkContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, applicationId }) => unlinkContactFromApplication(contactId, applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACT_KEYS.all });
    },
  });
}

/** Ping a contact (update last_contacted_at to now). */
export function usePingContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId }) => updateContact(contactId, { last_contacted_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACT_KEYS.all });
    },
  });
}
