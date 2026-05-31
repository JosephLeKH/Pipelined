/** Tests for error toast feedback in NotificationBell mutations. */

import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { toast } from "sonner";

import { useMarkRead, useMarkAllRead } from "../hooks/useNotifications";

vi.mock("sonner");

const server = setupServer(
  http.patch("/api/notifications/:id/read", () => HttpResponse.error()),
  http.patch("/api/notifications/read-all", () => HttpResponse.error())
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers() && vi.clearAllMocks());
afterAll(() => server.close());

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <MemoryRouter>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe("NotificationBell mutations – error toasts", () => {
  it("should show toast.error on mark-read failure", async () => {
    const { result } = renderHook(() => useMarkRead(), { wrapper });

    act(() => {
      result.current.mutate("notif1", {
        onError: () => toast.error("Couldn't mark as read"),
      });
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn't mark as read");
    });
  });

  it("should show toast.error on mark-all-read failure", async () => {
    const { result } = renderHook(() => useMarkAllRead(), { wrapper });

    act(() => {
      result.current.mutate(undefined, {
        onError: () => toast.error("Couldn't mark all read"),
      });
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn't mark all read");
    });
  });
});
