/** Tests for error toast feedback in useDetailPanelState. */

import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { toast } from "sonner";

import { useDetailPanelState } from "./useDetailPanelState";

vi.mock("sonner");
vi.mock("../lib/analytics", () => ({ trackEvent: vi.fn() }));

const server = setupServer(
  http.patch("/api/applications/:id", () => HttpResponse.error()),
  http.delete("/api/applications/:id", () => HttpResponse.error())
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers() && vi.clearAllMocks());
afterAll(() => server.close());

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const APP = {
  id: "app1",
  company: "Acme",
  role_title: "SE",
  current_stage: "Applied",
  notes: "",
  tags: [],
};

describe("useDetailPanelState – stage change error toast", () => {
  it("should show toast.error on stage change mutation failure", async () => {
    const { result } = renderHook(() => useDetailPanelState(APP, vi.fn(), vi.fn()), { wrapper });

    const mockEvent = { target: { value: "Phone Screen" } };
    act(() => {
      result.current.handleStageChange(mockEvent);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn't update stage — reverted");
    });
  });

  it("should revert cached app on stage change error", async () => {
    const { result } = renderHook(() => useDetailPanelState(APP, vi.fn(), vi.fn()), { wrapper });

    expect(result.current.cachedApp.current_stage).toBe("Applied");

    const mockEvent = { target: { value: "Phone Screen" } };
    act(() => {
      result.current.handleStageChange(mockEvent);
    });

    // After mutation, should revert
    await waitFor(() => {
      expect(result.current.cachedApp.current_stage).toBe("Applied");
    });
  });

  it("should show error toast on delete failure", async () => {
    const { result } = renderHook(() => useDetailPanelState(APP, vi.fn(), vi.fn()), { wrapper });

    act(() => {
      result.current.handleDelete();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn't delete — undone");
    });
  });
});
