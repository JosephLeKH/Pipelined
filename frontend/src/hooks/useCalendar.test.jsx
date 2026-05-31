/** Tests for useCalendar mutation hooks — onError handlers with toast notifications. */

import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

import { useCreateEvent, useUpdateEvent, useDeleteEvent } from "./useCalendar";
import { passthroughHandlers } from "../test/passthroughHandlers";

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

import { toast } from "sonner";

const server = setupServer(...passthroughHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useCreateEvent — onError handler", () => {
  it("should show error toast with server message on 500 failure", async () => {
    server.use(
      http.post("/api/calendar/events", () =>
        HttpResponse.json(
          { error: { code: "SERVER_ERROR", message: "Database connection failed" } },
          { status: 500 }
        )
      )
    );

    const { result } = renderHook(() => useCreateEvent(), { wrapper: makeWrapper() });
    const body = { application_id: "app1", event_type: "phone_screen", date: "2026-03-10" };

    result.current.mutate(body);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Database connection failed");
    });
  });

  it("should show fallback message when server error has no message", async () => {
    server.use(
      http.post("/api/calendar/events", () =>
        HttpResponse.json({ error: { code: "UNKNOWN_ERROR" } }, { status: 500 })
      )
    );

    const { result } = renderHook(() => useCreateEvent(), { wrapper: makeWrapper() });

    result.current.mutate({ application_id: "app1", event_type: "phone_screen", date: "2026-03-10" });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn't create event");
    });
  });
});

describe("useUpdateEvent — onError handler", () => {
  it("should show error toast with server message on 500 failure", async () => {
    server.use(
      http.patch("/api/calendar/events/:id", () =>
        HttpResponse.json(
          { error: { code: "NOT_FOUND", message: "Event no longer exists" } },
          { status: 404 }
        )
      )
    );

    const { result } = renderHook(() => useUpdateEvent(), { wrapper: makeWrapper() });

    result.current.mutate({ id: "ev1", body: { event_type: "onsite" } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Event no longer exists");
    });
  });

  it("should show fallback message when server error has no message", async () => {
    server.use(
      http.patch("/api/calendar/events/:id", () =>
        HttpResponse.json({ error: { code: "UNKNOWN_ERROR" } }, { status: 500 })
      )
    );

    const { result } = renderHook(() => useUpdateEvent(), { wrapper: makeWrapper() });

    result.current.mutate({ id: "ev1", body: { notes: "Updated" } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn't update event");
    });
  });
});

describe("useDeleteEvent — onError handler", () => {
  it("should show error toast with server message on 500 failure", async () => {
    server.use(
      http.delete("/api/calendar/events/:id", () =>
        HttpResponse.json(
          { error: { code: "PERMISSION_DENIED", message: "You don't own this event" } },
          { status: 403 }
        )
      )
    );

    const { result } = renderHook(() => useDeleteEvent(), { wrapper: makeWrapper() });

    result.current.mutate("ev1");

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("You don't own this event");
    });
  });

  it("should show fallback message when server error has no message", async () => {
    server.use(
      http.delete("/api/calendar/events/:id", () =>
        HttpResponse.json({ error: { code: "UNKNOWN_ERROR" } }, { status: 500 })
      )
    );

    const { result } = renderHook(() => useDeleteEvent(), { wrapper: makeWrapper() });

    result.current.mutate("ev1");

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn't delete event");
    });
  });
});
