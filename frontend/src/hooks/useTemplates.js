/** React Query hooks for application templates. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createTemplate,
  deleteTemplate,
  fetchTemplates,
  updateTemplate,
} from "../api/templates";

export const TEMPLATE_KEYS = {
  all: ["templates"],
  list: () => [...TEMPLATE_KEYS.all, "list"],
};

/** List all templates for the current user. */
export function useTemplates() {
  return useQuery({
    queryKey: TEMPLATE_KEYS.list(),
    queryFn: fetchTemplates,
  });
}

/** Create a new template. */
export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => createTemplate(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATE_KEYS.all });
    },
  });
}

/** Update a template (rename or update fields). */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => updateTemplate(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATE_KEYS.all });
    },
  });
}

/** Delete a template. */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATE_KEYS.all });
    },
  });
}
