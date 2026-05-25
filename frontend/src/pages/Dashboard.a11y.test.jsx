/** WCAG 2.1 AA axe audit for Dashboard — light and dark theme (PRD-04 Lighthouse proxy). */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import { axe, toHaveNoViolations } from "jest-axe";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import Dashboard from "./Dashboard";
import { withTooltipProvider } from "../test/testProviders";
import { passthroughHandlers } from "../test/passthroughHandlers";

expect.extend(toHaveNoViolations);

const APP = {
  id: "app1",
  company: "Acme Corp",
  role_title: "Software Engineer",
  current_stage: "Applied",
  date_applied: "2026-01-15T00:00:00Z",
  updated_at: "2026-03-20T00:00:00Z",
  source: "manual",
  stage_history: [{ stage: "Applied", transitioned_at: "2026-01-15T00:00:00Z" }],
  stages: ["Applied", "Phone Screen", "Onsite", "Offer", "Rejected"],
};

const server = setupServer(
  http.get("/api/auth/me", () =>
    HttpResponse.json({ data: { id: "u1", email: "test@example.com", display_name: "Test" } })
  ),
  http.get("/api/applications", () =>
    HttpResponse.json({ data: [APP], meta: { count: 1, next_cursor: null } })
  ),
  http.get("/api/applications/stats", () =>
    HttpResponse.json({
      data: {
        total_applied: 5,
        active_count: 3,
        response_rate: 0.4,
        avg_days_to_first_response: 7.2,
      },
    })
  ),
  ...passthroughHandlers
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  server.resetHandlers();
  document.documentElement.classList.remove("dark");
});
afterAll(() => server.close());

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AuthProvider>{withTooltipProvider(children)}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

const AXE_OPTS = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } };

describe("WCAG 2.1 AA — Dashboard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should have no axe violations in light theme", async () => {
    const { container } = render(<Dashboard />, { wrapper: makeWrapper() });

    await screen.findByText("Acme Corp");

    const results = await axe(container, AXE_OPTS);

    expect(results).toHaveNoViolations();
  });

  it("should have no axe violations in dark theme", async () => {
    document.documentElement.classList.add("dark");

    const { container } = render(<Dashboard />, { wrapper: makeWrapper() });

    await screen.findByText("Acme Corp");

    const results = await axe(container, AXE_OPTS);

    expect(results).toHaveNoViolations();
  });
});
