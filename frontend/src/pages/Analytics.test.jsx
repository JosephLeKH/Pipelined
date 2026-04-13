/** Tests for Analytics page — renders charts, empty state, date range selector. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import Analytics from "./Analytics";

const ANALYTICS_FULL = {
  applications_by_week: [
    { week: "2026-W01", count: 3 },
    { week: "2026-W02", count: 5 },
  ],
  stage_funnel: [
    { stage: "Applied", count: 8 },
    { stage: "Phone Screen", count: 2 },
  ],
  response_rate_by_month: [{ month: "2026-01", rate: 0.25 }],
  top_companies: [
    { company: "Acme", count: 4 },
    { company: "Beta Co", count: 2 },
  ],
};

const ANALYTICS_EMPTY = {
  applications_by_week: [],
  stage_funnel: [{ stage: "Applied", count: 2 }],
  response_rate_by_month: [],
  top_companies: [],
};

const server = setupServer(
  http.get("/api/auth/me", () =>
    HttpResponse.json({ id: "u1", email: "test@example.com", display_name: "Test" })
  ),
  http.get("/api/applications/analytics", () =>
    HttpResponse.json({ data: ANALYTICS_FULL })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderAnalytics() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/analytics"]}>
          <AuthProvider>
            <Analytics />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("Analytics", () => {
  it("should render the page heading", async () => {
    renderAnalytics();

    expect(await screen.findByRole("heading", { name: /analytics/i })).toBeInTheDocument();
  });

  it("should render date range buttons", async () => {
    renderAnalytics();

    expect(await screen.findByText("Last 30 days")).toBeInTheDocument();
    expect(screen.getByText("Last 90 days")).toBeInTheDocument();
    expect(screen.getByText("Last 180 days")).toBeInTheDocument();
    expect(screen.getByText("All time")).toBeInTheDocument();
  });

  it("should render chart section headings when data has enough entries", async () => {
    renderAnalytics();

    expect(await screen.findByText("Applications per Week")).toBeInTheDocument();
    expect(screen.getByText("Stage Funnel")).toBeInTheDocument();
    expect(screen.getByText("Response Rate by Month")).toBeInTheDocument();
    expect(screen.getByText("Top 10 Companies Applied To")).toBeInTheDocument();
  });

  it("should show empty state when total applications is below threshold", async () => {
    server.use(
      http.get("/api/applications/analytics", () =>
        HttpResponse.json({ data: ANALYTICS_EMPTY })
      )
    );

    renderAnalytics();

    expect(
      await screen.findByText("Not enough data yet")
    ).toBeInTheDocument();
  });

  it("should highlight the active date range button", async () => {
    renderAnalytics();

    // Default is 90 days — wait for page to render then check active state
    const btn = await screen.findByText("Last 90 days");
    expect(btn.className).toMatch(/bg-brand-600/);
  });

  it("should switch date range on button click", async () => {
    renderAnalytics();

    await screen.findByText("Last 90 days");
    await userEvent.click(screen.getByText("Last 30 days"));

    expect(screen.getByText("Last 30 days").className).toMatch(/bg-brand-600/);
  });
});
