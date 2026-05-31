/** Tests for error toast feedback in useApplicationListRowActions. */

import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { toast } from "sonner";

import { useApplicationListRowActions } from "./useApplicationListRowActions";
import { KEYS } from "./useApplications";

vi.mock("sonner");

const server = setupServer(
  http.patch("/api/applications/:id/archive", () => HttpResponse.error()),
  http.patch("/api/applications/:id/delete", () => HttpResponse.error())
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers() && vi.clearAllMocks());
afterAll(() => server.close());

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useApplicationListRowActions – archive/delete error toasts", () => {
  it("should show toast.error on archive failure", async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const filters = { current_stage: "Applied" };
    queryClient.setQueryData(KEYS.list(filters), {
      data: [{ id: "app1", company: "Acme" }],
    });

    const { result } = renderHook(
      () =>
        useApplicationListRowActions({
          archiveMutation: { mutate: vi.fn((id, opts) => {
            setTimeout(() => opts.onError?.(), 10);
          }) },
          deleteMutation: { mutate: vi.fn() },
          restoreMutation: { mutate: vi.fn() },
          unarchiveMutation: { mutate: vi.fn() },
          undoBulkMutation: { mutate: vi.fn() },
          queryClient,
          queryFilters: filters,
          setUndoAction: vi.fn(),
          searchParams: new URLSearchParams(),
          setSearchParams: vi.fn(),
          sortBy: "date",
          sortOrder: "desc",
        }),
      { wrapper }
    );

    act(() => {
      result.current.handleArchive("app1");
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn't archive — undone");
    });
  });

  it("should show toast.error on delete failure", async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const filters = { current_stage: "Applied" };
    queryClient.setQueryData(KEYS.list(filters), {
      data: [{ id: "app1", company: "Acme" }],
    });

    const { result } = renderHook(
      () =>
        useApplicationListRowActions({
          archiveMutation: { mutate: vi.fn() },
          deleteMutation: { mutate: vi.fn((id, opts) => {
            setTimeout(() => opts.onError?.(), 10);
          }) },
          restoreMutation: { mutate: vi.fn() },
          unarchiveMutation: { mutate: vi.fn() },
          undoBulkMutation: { mutate: vi.fn() },
          queryClient,
          queryFilters: filters,
          setUndoAction: vi.fn(),
          searchParams: new URLSearchParams(),
          setSearchParams: vi.fn(),
          sortBy: "date",
          sortOrder: "desc",
        }),
      { wrapper }
    );

    act(() => {
      result.current.handleDelete("app1");
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn't delete — undone");
    });
  });
});
