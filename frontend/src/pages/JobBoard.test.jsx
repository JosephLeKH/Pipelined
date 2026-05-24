/** Tests for JobBoard saved searches UI. */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import JobBoard from "./JobBoard";
import { passthroughHandlers } from "../test/passthroughHandlers";
import { withTooltipProvider } from "../test/testProviders";

const EMPTY_JOBS = { data: [], meta: { total: 0, page: 1, per_page: 30, total_pages: 0 } };
const SAVED_SEARCHES_WITH_BADGE = {
  data: [
    {
      id: "ss1",
      name: "Remote SWE",
      query: "software engineer",
      filters: { remote_status: "remote" },
      new_matches_count: 5,
      last_checked_at: null,
      created_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "ss2",
      name: "PM Intern",
      query: "",
      filters: { role_type: "internship" },
      new_matches_count: 0,
      last_checked_at: null,
      created_at: "2024-01-02T00:00:00Z",
    },
  ],
};

const server = setupServer(
  http.get("/api/jobs", () => HttpResponse.json(EMPTY_JOBS)),
  http.get("/api/saved-searches", () => HttpResponse.json(SAVED_SEARCHES_WITH_BADGE)),
  http.post("/api/saved-searches", () => HttpResponse.json({ data: {} }, { status: 201 })),
  http.delete("/api/saved-searches/:id", () => new HttpResponse(null, { status: 204 })),
  http.get("/api/auth/me", () =>
    HttpResponse.json({ data: { id: "u1", email: "test@example.com", display_name: "Test" } })
  ),
  ...passthroughHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper(initialSearch = "") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/jobs${initialSearch}`]}>
          <AuthProvider>{withTooltipProvider(children)}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("JobBoard saved searches", () => {
  it("should not show save button when no filters are active", async () => {
    render(<JobBoard />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /save this search/i })).toBeNull();
    });
  });

  it("should show save button when query param is active", async () => {
    render(<JobBoard />, { wrapper: makeWrapper("?q=engineer") });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save this search/i })).toBeDefined();
    });
  });

  it("should show save button when filter param is active", async () => {
    render(<JobBoard />, { wrapper: makeWrapper("?remote_status=remote") });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save this search/i })).toBeDefined();
    });
  });

  it("should open save popover when save button clicked", async () => {
    render(<JobBoard />, { wrapper: makeWrapper("?q=engineer") });

    await waitFor(() => screen.getByRole("button", { name: /save this search/i }));
    fireEvent.click(screen.getByRole("button", { name: /save this search/i }));

    expect(screen.getByRole("dialog", { name: /name this search/i })).toBeDefined();
    expect(screen.getByLabelText("Saved search name")).toBeDefined();
  });

  it("should render saved searches list with names", async () => {
    render(<JobBoard />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Remote SWE")).toBeDefined();
      expect(screen.getByText("PM Intern")).toBeDefined();
    });
  });

  it("should render new matches badge for searches with new_matches_count > 0", async () => {
    render(<JobBoard />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText("5 new matches")).toBeDefined();
    });
  });

  it("should not render badge for searches with new_matches_count = 0", async () => {
    render(<JobBoard />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.queryByLabelText("0 new matches")).toBeNull();
    });
  });
});
