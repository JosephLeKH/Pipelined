/** WCAG 2.1 AA axe audit for Settings — light and dark theme (PRD-08). */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import { axe, toHaveNoViolations } from "jest-axe";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import Settings from "./Settings";
import { passthroughHandlers } from "../test/passthroughHandlers";
import { withTooltipProvider } from "../test/testProviders";

expect.extend(toHaveNoViolations);

const server = setupServer(
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "u1",
        email: "test@example.com",
        display_name: "Test User",
        timezone: "America/Los_Angeles",
        default_stages: ["Applied", "Offer", "Rejected"],
        application_count: 12,
        contact_count: 5,
        ai_scores_today: 2,
        referral_code: "test-user",
        referral_count: 1,
      },
    }),
  ),
  ...passthroughHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  server.resetHandlers();
  document.documentElement.classList.remove("dark");
});
afterAll(() => server.close());

function makeWrapper(initialEntries = ["/settings/profile"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return () => (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route
              path="/settings/*"
              element={
                <AuthProvider>{withTooltipProvider(<Settings />)}</AuthProvider>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

const AXE_OPTS = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } };

describe("WCAG 2.1 AA — Settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should have no axe violations on profile in light theme", async () => {
    const { container } = render(null, { wrapper: makeWrapper(["/settings/profile"]) });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^profile$/i })).toBeInTheDocument();
    });

    const results = await axe(container, AXE_OPTS);
    expect(results).toHaveNoViolations();
  });

  it("should have no axe violations on profile in dark theme", async () => {
    document.documentElement.classList.add("dark");

    const { container } = render(null, { wrapper: makeWrapper(["/settings/profile"]) });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^profile$/i })).toBeInTheDocument();
    });

    const results = await axe(container, AXE_OPTS);
    expect(results).toHaveNoViolations();
  });

  it("should have no axe violations on appearance in dark theme", async () => {
    document.documentElement.classList.add("dark");

    const { container } = render(null, { wrapper: makeWrapper(["/settings/appearance"]) });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^appearance$/i })).toBeInTheDocument();
    });

    const results = await axe(container, AXE_OPTS);
    expect(results).toHaveNoViolations();
  });

  it("should have no axe violations on billing in dark theme", async () => {
    document.documentElement.classList.add("dark");

    const { container } = render(null, { wrapper: makeWrapper(["/settings/billing"]) });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /plan & usage/i })).toBeInTheDocument();
    });

    const results = await axe(container, AXE_OPTS);
    expect(results).toHaveNoViolations();
  });
});
