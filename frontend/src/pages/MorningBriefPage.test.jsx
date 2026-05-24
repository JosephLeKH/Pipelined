/** Smoke tests for MorningBriefPage. */

import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import MorningBriefPage from "./MorningBriefPage";
import { BRIEF_EMPTY_MESSAGE } from "../lib/briefConstants";
import { passthroughHandlers } from "../test/passthroughHandlers";

const MOCK_BRIEF = {
  date: "2026-05-23",
  summary_line: "1 follow-up, 1 interview",
  sections: {
    follow_ups: [{
      title: "Acme — follow-up overdue",
      body: "Draft ready in detail panel",
      action_url: "/dashboard?selected=app1&action=follow-up",
    }],
    interviews: [],
    high_matches: [],
    pending_approvals: [],
  },
};

const server = setupServer(
  http.get("/api/brief/today", () => HttpResponse.json({ data: MOCK_BRIEF })),
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "user1",
        email: "test@test.com",
        display_name: "Test",
        has_resume: false,
        weekly_goal: 5,
        default_stages: [],
      },
    })
  ),
  http.post("/api/auth/refresh", () => HttpResponse.json({ data: { ok: true } })),
  ...passthroughHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return (
      <ThemeProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    );
  };
}

describe("MorningBriefPage", () => {
  it("should render page heading and brief sections", async () => {
    render(<MorningBriefPage />, { wrapper: makeWrapper() });

    expect(await screen.findByRole("heading", { name: "Morning Brief" })).toBeInTheDocument();
    expect(await screen.findByText("Acme — follow-up overdue")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Follow-ups" })).toBeInTheDocument();
  });

  it("should show empty state when brief fetch fails", async () => {
    server.use(
      http.get("/api/brief/today", () => HttpResponse.json({ error: { message: "limit" } }, { status: 429 }))
    );

    render(<MorningBriefPage />, { wrapper: makeWrapper() });

    expect(await screen.findByText(BRIEF_EMPTY_MESSAGE)).toBeInTheDocument();
  });
});
